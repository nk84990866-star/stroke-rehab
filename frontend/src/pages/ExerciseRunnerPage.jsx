import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getExerciseDetail, saveSession } from '../services/api';
import {
  isVoiceEnabled,
  isVoiceSupported,
  setVoiceEnabled,
  speak,
  stopSpeaking,
} from '../services/voice';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Flag,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Timer,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Badge, Button, Card, ProgressBar, LoadingState, StatCard } from '../components/ui';
import { EXERCISE_CATEGORY_LABELS } from '../config/labels';
import { cn } from '../lib/cn';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/** Session status machine: READY → IN PROGRESS → COMPLETING → COMPLETED (or PAUSED). */
const STATUS_META = {
  ready: { label: 'Ready', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  completing: { label: 'Completing…', variant: 'primary' },
  completed: { label: 'Completed', variant: 'success' },
};

/**
 * Repetition counting (deterministic, measured — not estimated):
 * a rep is one full lift-and-lower cycle of the tracked arm, measured on the
 * already-computed smoothed vertical offset (dy) inside the detection loop.
 * Thresholds adapt to the patient's own movement during the session:
 *   - a lift starts when dy rises above max(MIN_REP_AMPLITUDE, 50% of the
 *     session's largest dy so far) — MIN_REP_AMPLITUDE is a small noise gate
 *     so trembling cannot start a rep;
 *   - the rep completes when dy falls back below 35% of that lift's peak.
 * Movement between the two thresholds cannot double-count (hysteresis).
 * Sessions with no lifting motion record 0 reps.
 */
const MIN_REP_AMPLITUDE = 40; // dy units (≈ 0.13 normalized offset) — noise gate only

const ExerciseRunnerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('ready'); // ready | in_progress | paused | completing | completed
  const [score, setScore] = useState(100.0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [targetsHit, setTargetsHit] = useState(0);
  const [repCount, setRepCount] = useState(0); // mirrored from ref; updates only when a rep completes

  // Voice assistance: supported = browser capability; on = user opt-in (persisted, default OFF)
  const [voiceSupported] = useState(() => isVoiceSupported());
  const [voiceOn, setVoiceOn] = useState(() => isVoiceEnabled());
  const [coachHint, setCoachHint] = useState("Loading AI Model...");
  const [error, setError] = useState('');
  const [modelReady, setModelReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saveResult, setSaveResult] = useState(null); // real metrics from the session API

  // WebRTC & Canvas references
  const videoRef = useRef(null);
  const twinRef = useRef(null);
  const overlayRef = useRef(null); // Canvas over the webcam
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);

  // Rehab tracking state
  const anglesHistory = useRef([]);
  const frameIdRef = useRef(null);
  const currentTargetIndex = useRef(0);
  const holdStartTime = useRef(null);
  const lastVideoTime = useRef(-1);
  const smoothedStateRef = useRef(null);   // EMA smoothing state for twin movement
  const activeSideRef = useRef(null);      // which arm is tracked: 'left' | 'right'
  const containerRef = useRef(null);       // webcam box — aspect set from the real stream

  // Repetition tracking (see MIN_REP_AMPLITUDE note above for the rule)
  const repCountRef = useRef(0);            // completed reps this session
  const repStateRef = useRef('lowered');    // hysteresis state: 'lowered' | 'raised'
  const repPeakRef = useRef(0);             // peak smoothed dy of the current lift
  const sessionMaxDyRef = useRef(0);        // running max dy — per-session calibration
  const poseDetectedRef = useRef(false);

  // Load exercise and model
  useEffect(() => {
    const initialize = async () => {
      try {
        const data = await getExerciseDetail(id);
        setExercise(data);
        setTimeLeft(data.duration_seconds);

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });

        setModelReady(true);
        setCoachHint("Model Ready! Click Initialize Camera.");
      } catch (err) {
        console.error('Error initialization:', err);
        setError("The AI model could not be loaded. Please refresh the page and try again.");
      } finally {
        setLoading(false);
      }
    };
    initialize();

    return () => {
      stopCamera();
      stopSpeaking();
      if (landmarkerRef.current) landmarkerRef.current.close();
    };
  }, [id]);

  const runningRef = useRef(false);

  const stopCamera = () => {
    setRunning(false);
    runningRef.current = false;
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (overlayRef.current) {
        const ctx = overlayRef.current.getContext('2d');
        ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  };

  const handleStart = async () => {
    setError('');
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      videoRef.current.onloadeddata = () => {
        setCameraStarting(false);
        setRunning(true);
        runningRef.current = true;
        setStatus('in_progress');
        setCoachHint("Raise your arm toward the green target!");
        currentTargetIndex.current = 0;
        anglesHistory.current = [];
        smoothedStateRef.current = null;   // fresh smoothing per session
        activeSideRef.current = null;      // re-select tracked arm
        lastVideoTime.current = -1;
        setTargetsHit(0);
        // Fresh repetition tracking per session
        repCountRef.current = 0;
        setRepCount(0);
        repStateRef.current = 'lowered';
        repPeakRef.current = 0;
        sessionMaxDyRef.current = 0;
        // Match the webcam box to the real stream aspect ratio so the overlay
        // skeleton lines up with the video (no stretch/crop mismatch).
        const v = videoRef.current;
        if (containerRef.current && v && v.videoWidth && v.videoHeight) {
          containerRef.current.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`;
        }
      };
    } catch (err) {
      console.error('Camera error:', err);
      setCameraStarting(false);
      if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Camera permission was denied. Please allow camera access in your browser settings and try again.');
      } else if (err && (err.name === 'NotFoundError' || err.name === 'NotReadableError')) {
        setError('No camera is available. Please connect a camera and try again.');
      } else {
        setError('The camera could not be started. Please check your device and try again.');
      }
    }
  };

  // Pause: stop the detection loop but keep angle history and smoothing state
  // so the session can resume exactly where it left off.
  const handlePause = () => {
    if (runningRef.current) {
      setRunning(false);
      runningRef.current = false;
      setStatus('paused');
      setCoachHint('Session paused. Press Resume when ready.');
    }
  };

  const handleResume = () => {
    if (!runningRef.current && status === 'paused') {
      setRunning(true);
      runningRef.current = true;
      setStatus('in_progress');
      setCoachHint('Session resumed. Reach toward the target!');
    }
  };

  useEffect(() => {
    if (running && exercise && landmarkerRef.current) {
      detectLoop();
    }
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [running]);

  const detectLoop = useCallback(() => {
    if (!runningRef.current || !exercise || !videoRef.current || !landmarkerRef.current) return;

    // Always draw Grid and Target on Digital Twin regardless of webcam frame
    const ctx = twinRef.current?.getContext('2d');
    const width = twinRef.current?.width || 400;
    const height = twinRef.current?.height || 350;
    // Theme-aware twin colors (dark mode: dark grid, light text)
    const isDark = document.documentElement.classList.contains('dark');

    if (ctx && exercise) {
      ctx.clearRect(0, 0, width, height);

      // Draw Grid
      ctx.strokeStyle = isDark ? '#334155' : '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
      for (let j = 0; j < height; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke(); }

      const shoulderX = width / 2;
      const shoulderY = height / 2 + 50;

      const targets = exercise.target_positions;
      let currentTarget = null;
      if (targets && targets.length > 0) {
        currentTarget = targets[currentTargetIndex.current % targets.length];
      }

      if (currentTarget) {
        const targetX = shoulderX + (currentTarget.x * 4);
        const targetY = shoulderY - (currentTarget.y * 4);

        // Respect prefers-reduced-motion: keep the target marker static
        // instead of pulsing every frame for users who opt out of motion.
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        const radius = reduceMotion ? 15 : 15 + Math.sin(Date.now() / 150) * 3;
        ctx.beginPath();
        ctx.arc(targetX, targetY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = isDark ? '#6ee7b7' : '#065f46';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`Target ${currentTargetIndex.current + 1}`, targetX - 25, targetY - 25);
      }          let startTimeMs = performance.now();
          try {
            if (videoRef.current.readyState >= 2 && videoRef.current.currentTime !== lastVideoTime.current) {
              lastVideoTime.current = videoRef.current.currentTime;
              const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

              const lm = (results.landmarks && results.landmarks.length > 0) ? results.landmarks[0] : null;

              // Pose-detected indicator: update React state only when the value
              // changes (keeps re-renders out of the per-frame path).
              const poseNow = !!lm;
              if (poseNow !== poseDetectedRef.current) {
                poseDetectedRef.current = poseNow;
                setPoseDetected(poseNow);
              }

              // Pick the arm actually being exercised: the one whose wrist is
              // raised highest. Sticky (hysteresis) so it doesn't flicker
              // between arms — switching needs a clear 0.06 advantage.
              let sideIdx = { s: 12, e: 14, w: 16 }; // default: right arm
              if (lm && lm[11] && lm[12] && lm[15] && lm[16]) {
                const rightScore = Math.max(0, lm[12].y - lm[16].y); // wrist above shoulder?
                const leftScore  = Math.max(0, lm[11].y - lm[15].y);
                let side = activeSideRef.current;
                if (!side) {
                  side = leftScore > rightScore ? 'left' : 'right';
                } else if (side === 'right' && leftScore > rightScore + 0.06) {
                  side = 'left';
                } else if (side === 'left' && rightScore > leftScore + 0.06) {
                  side = 'right';
                }
                activeSideRef.current = side;
                sideIdx = side === 'left' ? { s: 11, e: 13, w: 15 } : { s: 12, e: 14, w: 16 };
              }

              // Draw webcam overlay (raw landmark coords; CSS mirrors both
              // video and canvas identically, so they stay aligned).
              const overlayCtx = overlayRef.current?.getContext('2d');
              if (overlayCtx && videoRef.current.videoWidth) {
                if (overlayRef.current.width !== videoRef.current.videoWidth) {
                  overlayRef.current.width = videoRef.current.videoWidth;
                  overlayRef.current.height = videoRef.current.videoHeight;
                }
                overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

                if (lm) {
                  overlayCtx.fillStyle = '#10b981';
                  const drawJoint = (idx) => {
                    if (lm[idx]) {
                      overlayCtx.beginPath();
                      overlayCtx.arc(lm[idx].x * overlayRef.current.width, lm[idx].y * overlayRef.current.height, 8, 0, 2 * Math.PI);
                      overlayCtx.fill();
                    }
                  };
                  drawJoint(sideIdx.s); drawJoint(sideIdx.e); drawJoint(sideIdx.w);

                  if (lm[sideIdx.s] && lm[sideIdx.e] && lm[sideIdx.w]) {
                    overlayCtx.strokeStyle = '#10b981';
                    overlayCtx.lineWidth = 4;
                    overlayCtx.beginPath();
                    overlayCtx.moveTo(lm[sideIdx.s].x * overlayRef.current.width, lm[sideIdx.s].y * overlayRef.current.height);
                    overlayCtx.lineTo(lm[sideIdx.e].x * overlayRef.current.width, lm[sideIdx.e].y * overlayRef.current.height);
                    overlayCtx.lineTo(lm[sideIdx.w].x * overlayRef.current.width, lm[sideIdx.w].y * overlayRef.current.height);
                    overlayCtx.stroke();
                  }
                }
              }

          let handX = shoulderX;
          let handY = shoulderY;

          if (lm && lm[sideIdx.s] && lm[sideIdx.e] && lm[sideIdx.w]) {
            const shoulder = lm[sideIdx.s];
            const elbow = lm[sideIdx.e];
            const wrist = lm[sideIdx.w];

            const rawDx = (shoulder.x - wrist.x) * 300;
            const rawDy = (shoulder.y - wrist.y) * 300; // Fixed inverted Y axis

            const rawElbowDx = (shoulder.x - elbow.x) * 300;
            const rawElbowDy = (shoulder.y - elbow.y) * 300; // Fixed inverted Y axis

            // EMA Smoothing to reduce jiggling (0.0 to 1.0, higher is faster, lower is smoother)
            // Reset whenever the tracked arm switches so old offsets don't smear.
            const smoothing = 0.35;
            if (!smoothedStateRef.current || smoothedStateRef.current.side !== activeSideRef.current) {
              smoothedStateRef.current = { side: activeSideRef.current, dx: rawDx, dy: rawDy, elbowDx: rawElbowDx, elbowDy: rawElbowDy };
            } else {
              smoothedStateRef.current.dx = smoothedStateRef.current.dx * (1 - smoothing) + rawDx * smoothing;
              smoothedStateRef.current.dy = smoothedStateRef.current.dy * (1 - smoothing) + rawDy * smoothing;
              smoothedStateRef.current.elbowDx = smoothedStateRef.current.elbowDx * (1 - smoothing) + rawElbowDx * smoothing;
              smoothedStateRef.current.elbowDy = smoothedStateRef.current.elbowDy * (1 - smoothing) + rawElbowDy * smoothing;
            }

            const dx = smoothedStateRef.current.dx;
            const dy = smoothedStateRef.current.dy;
            const elbowDx = smoothedStateRef.current.elbowDx;
            const elbowDy = smoothedStateRef.current.elbowDy;

            handX = shoulderX + dx;
            handY = shoulderY - dy;

            const mappedElbowX = shoulderX + elbowDx;
            const mappedElbowY = shoulderY - elbowDy;

            // Skeleton stays saturated blue in both themes (contrast on both
            // light and dark twin backgrounds); joints/hand pop in dark mode.
            ctx.beginPath(); ctx.arc(shoulderX, shoulderY, 12, 0, 2 * Math.PI); ctx.fillStyle = isDark ? '#93c5fd' : '#1e3a8a'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(mappedElbowX, mappedElbowY); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 8; ctx.stroke();
            ctx.beginPath(); ctx.arc(mappedElbowX, mappedElbowY, 10, 0, 2 * Math.PI); ctx.fillStyle = isDark ? '#93c5fd' : '#1e3a8a'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(mappedElbowX, mappedElbowY); ctx.lineTo(handX, handY); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 6; ctx.stroke();
            ctx.beginPath(); ctx.arc(handX, handY, 8, 0, 2 * Math.PI); ctx.fillStyle = '#10b981'; ctx.fill();

            // Convert normalized landmark offsets to approximate joint angles
            // (degrees). Only the magnitude matters for ROM/smoothness metrics;
            // scaling keeps values in a realistic 0-180° clinical range instead
            // of raw pixel-space numbers like 178.1310772640824.
            const toDeg = (v) => Math.min(180, Math.abs(v) * 0.6);
            anglesHistory.current.push([toDeg(dx), toDeg(dy)]);

            // --- Repetition counting (measurement only; does not affect
            // angles, targets, or scoring). Uses the smoothed dy already
            // computed above. See MIN_REP_AMPLITUDE doc for the rule. ---
            const absDy = Math.abs(dy);
            if (absDy > sessionMaxDyRef.current) sessionMaxDyRef.current = absDy;
            if (repStateRef.current === 'lowered') {
              // Lift threshold: noise gate, or half of the patient's best lift
              const liftThreshold = Math.max(MIN_REP_AMPLITUDE, sessionMaxDyRef.current * 0.5);
              if (absDy >= liftThreshold) {
                repStateRef.current = 'raised';
                repPeakRef.current = absDy;
              }
            } else {
              // Track the peak of the current lift
              if (absDy > repPeakRef.current) repPeakRef.current = absDy;
              // Complete the rep when the arm returns below 35% of its peak
              if (absDy <= repPeakRef.current * 0.35) {
                repCountRef.current += 1;
                setRepCount(repCountRef.current); // change-gated; ~1 render per rep
                repStateRef.current = 'lowered';
                repPeakRef.current = 0;
              }
            }
          }

          // Target Hit Logic
          if (currentTarget) {
            const targetCanvasX = shoulderX + (currentTarget.x * 4);
            const targetCanvasY = shoulderY - (currentTarget.y * 4);
            const distance = Math.sqrt(Math.pow(handX - targetCanvasX, 2) + Math.pow(handY - targetCanvasY, 2));

            if (distance < 35) {
              if (!holdStartTime.current) holdStartTime.current = Date.now();
              const holdDuration = (Date.now() - holdStartTime.current) / 1000;

              if (holdDuration >= (currentTarget.hold_sec || 1.0)) {
                currentTargetIndex.current += 1;
                setTargetsHit(prev => prev + 1);
                setCoachHint("Target Hit! Move to the next target.");
                holdStartTime.current = null;
              } else {
                setCoachHint(`Hold arm steady: ${Math.max(0, (currentTarget.hold_sec || 1.0) - holdDuration).toFixed(1)}s`);
              }
            } else {
              holdStartTime.current = null;
              if (handY > targetCanvasY + 30) setCoachHint("Lift arm higher!");
              else if (handX < targetCanvasX - 30) setCoachHint("Reach further right!");
              else if (handX > targetCanvasX + 30) setCoachHint("Reach further left!");
              else setCoachHint("Reach toward the green target!");
            }
          }
        }
      } catch(err) {
        console.error("AI Error:", err);
      }
    }

    frameIdRef.current = requestAnimationFrame(detectLoop);
  }, [running, exercise]);

  // ---- Voice assistance (optional, opt-in; every spoken line is also visible) ----
  useEffect(() => {
    if (!voiceOn) stopSpeaking();
  }, [voiceOn]);

  // Speak coach hints only while the session is running
  useEffect(() => {
    if (voiceOn && running) speak(coachHint);
  }, [coachHint, voiceOn, running]);

  // Optional voice countdown for the final 10 seconds
  useEffect(() => {
    if (voiceOn && running && timeLeft > 0 && timeLeft <= 10) speak(`${timeLeft}`);
  }, [timeLeft, voiceOn, running]);

  // Session timer: a single interval drives both remaining and elapsed so the
  // two can never disagree. Auto-completes when the prescribed duration ends.
  useEffect(() => {
    let interval = null;
    if (running && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        setElapsed(prev => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && running) {
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [running, timeLeft]);

  const persistSession = async () => {
    setSaving(true);
    setSaveFailed(false);
    try {
      const result = await saveSession({
        exercise_id: Number(id),
        duration_seconds: exercise.duration_seconds,
        avg_accuracy_score: score,
        targets_hit: targetsHit,
        total_targets: targetsHit + 1,
        joint_angle_data: anglesHistory.current
      });
      setSaveResult({
        sessionId: result?.session?.id || null,
        repetitions: repCountRef.current,
        overallScore: result?.session?.overall_score ?? null,
        pointsEarned: result?.points_earned ?? null,
        newStreak: result?.new_streak ?? null,
        unlockedBadges: result?.unlocked_badges || [],
        // Flag for the Achievements page: show a one-time celebration banner
        // for badges actually persisted during this session save.
        ...(result?.unlocked_badges?.length
          ? (() => { sessionStorage.setItem('nm_new_badges', JSON.stringify(result.unlocked_badges)); return {}; })()
          : {}),
        maxRom: result?.session?.max_rom_achieved ?? null,
        smoothness: result?.session?.movement_smoothness_score ?? null,
        avgVelocity: result?.session?.avg_joint_velocity ?? null,
        targetsHit: result?.session?.targets_hit ?? targetsHit,
        totalTargets: result?.session?.total_targets ?? (targetsHit + 1),
        duration: result?.session?.duration_seconds ?? exercise.duration_seconds,
      });
      setStatus('completed');
      speak('Exercise Completed', { force: true });
    } catch (err) {
      console.error("Error saving session logs:", err);
      speak('Your session could not be saved. Please try again.', { force: true });
      // Keep the session data; let the patient retry. Never show a false
      // "Completed" screen when saving failed.
      setSaveFailed(true);
      setStatus('completing');
      if (err?.response?.status === 401) {
        setError('Your sign-in session has expired. Please sign in again to save your session.');
      } else if (!err?.response) {
        setError('The service could not be reached. Check your connection and try saving again.');
      } else {
        setError('Your session could not be saved. Your exercise data is kept — please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Finish = stop camera + save. Guarded against double clicks via `saving`.
  const handleFinish = () => {
    if (saving) return;
    stopCamera();
    setStatus('completing');
    persistSession();
  };

  const retrySave = () => {
    if (saving) return;
    persistSession();
  };

  const handlePracticeAgain = () => {
    setSaveResult(null);
    setSaveFailed(false);
    setError('');
    setStatus('ready');
    setTimeLeft(exercise.duration_seconds);
    setElapsed(0);
    setTargetsHit(0);
    setRepCount(0);
    setCoachHint('Camera ready. Press Start Exercise when you are.');
    currentTargetIndex.current = 0;
    anglesHistory.current = [];
    smoothedStateRef.current = null;
    activeSideRef.current = null;
    holdStartTime.current = null;
    lastVideoTime.current = -1;
    poseDetectedRef.current = false;
    setPoseDetected(false);
  };

  /* ---- Completion screen: reps are shown only when at least one was measured ---- */
  const repStat = saveResult?.repetitions > 0
    ? `${saveResult.repetitions} rep${saveResult.repetitions !== 1 ? 's' : ''} measured`
    : null;

  // Format metric numbers to a fixed number of decimals.
  const fmt = (v, decimals = 1) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(decimals) : '—';
  };

  if (loading) {
    return <LoadingState fullPage message="Preparing your session…" />;
  }

  /* ================= COMPLETION SCREEN (real metrics only) ================= */
  if (status === 'completed' && saveResult) {
    return (
      <div className="bg-surface dark:bg-slate-950 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-8 text-center">
            <span className="inline-flex items-center justify-center p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 mb-4">
              <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">Exercise Completed</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {exercise.name} · {saveResult.duration}s session
              {saveResult.newStreak != null && <> · {saveResult.newStreak} day streak</>}
              {repStat && <> · {repStat}</>}
            </p>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              icon={Award}
              color="primary"
              label="Session Score"
              value={saveResult.overallScore != null ? `${fmt(saveResult.overallScore)}%` : '—'}
            />
            <StatCard
              icon={Award}
              color="warning"
              label="Points Earned"
              value={saveResult.pointsEarned != null ? `${saveResult.pointsEarned}` : '—'}
              sub="XP"
            />
            <StatCard
              icon={Timer}
              color="purple"
              label="Movement Smoothness"
              value={saveResult.smoothness != null ? `${fmt(saveResult.smoothness)}/100` : '—'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              icon={Timer}
              label="Max ROM"
              value={saveResult.maxRom != null ? `${fmt(saveResult.maxRom, 2)}°` : '—'}
            />
            <StatCard
              icon={Flag}
              label="Targets Reached"
              value={`${saveResult.targetsHit} / ${saveResult.totalTargets}`}
            />
            <StatCard
              icon={Timer}
              label="Avg Joint Velocity"
              value={saveResult.avgVelocity != null ? `${fmt(saveResult.avgVelocity, 2)}` : '—'}
              sub="deg/s"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {saveResult.sessionId && (
              <Button asChild size="lg">
                <Link to={`/reports/${saveResult.sessionId}`}>View Report</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <Link to="/dashboard">Back to Today's Plan</Link>
            </Button>
            <Button variant="secondary" size="lg" onClick={handlePracticeAgain}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Practice Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const targets = Array.isArray(exercise.target_positions) ? exercise.target_positions : [];
  const holdSecs = targets.map((t) => Number(t.hold_sec) || 0).filter(Boolean);
  const maxHold = holdSecs.length ? Math.max(...holdSecs) : null;
  const progressPct = exercise.duration_seconds > 0
    ? Math.min(100, (elapsed / exercise.duration_seconds) * 100)
    : 0;
  const statusMeta = STATUS_META[status] || STATUS_META.ready;

  return (
    <div className="bg-surface dark:bg-slate-950 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ============ HEADER ============ */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate('/exercises')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 mb-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Exercises
              </button>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 truncate">{exercise.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant={exercise.level === 3 ? 'danger' : exercise.level === 2 ? 'warning' : 'success'}>
                  Level {exercise.level}{exercise.level_name ? ` · ${exercise.level_name}` : ''}
                </Badge>
                {exercise.category && (
                  <Badge variant="default">
                    {EXERCISE_CATEGORY_LABELS[exercise.category] || exercise.category}
                  </Badge>
                )}
                <Badge variant="default">
                  <Timer className="h-3 w-3" aria-hidden="true" /> {exercise.duration_seconds}s
                </Badge>
                {maxHold != null && (
                  <Badge variant="default">Hold up to {maxHold}s</Badge>
                )}
              </div>
            </div>              <div className="flex items-center gap-4">
              {running && (
                <div
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                  role="status"
                  aria-label={`Repetitions completed: ${repCount}`}
                >
                  <Repeat className="h-4 w-4 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200" aria-hidden="true" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{repCount} reps</span>
                </div>
 )}
              {/* Session status — text + icon, never color-only */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                role="status"
                aria-live="polite"
              >
                {status === 'in_progress' && <span className="h-2.5 w-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/400" aria-hidden="true" />}
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{statusMeta.label}</span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Remaining
                </span>
                <span className="block text-2xl font-extrabold text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 tabular-nums">{timeLeft}s</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 tabular-nums">{elapsed}s elapsed</span>
              </div>
            </div>
          </div>

          {/* Session progress from the existing timer only */}
          <ProgressBar
            label="Session progress"
            value={progressPct}
            valueText={`${Math.round(progressPct)}% of ${exercise.duration_seconds}s`}
            size="sm"
          />
        </div>

        {error && (
          <div role="alert" className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* ============ CAMERA / TWIN ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3 p-5 sm:p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50" id="camera-panel-title">Camera Tracking</h2>
              {running && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1"
                  aria-live="polite"
                >
                  {poseDetected ? (
                    <>
                      <Video className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> Pose detected
                    </>
                  ) : (
                    <>
                      <VideoOff className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" /> Looking for you…
                    </>
                  )}
                </span>
              )}
            </div>
            <div
              ref={containerRef}
              role="group"
              aria-labelledby="camera-panel-title"
              aria-describedby="camera-privacy-note"
              className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center"
            >
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full transform -scale-x-100 pointer-events-none" />
              {status === 'ready' && !running && (
                <button onClick={handleStart} disabled={!modelReady || cameraStarting} className="absolute px-6 py-3.5 bg-primary-600 text-white font-bold text-base rounded-xl shadow-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center cursor-pointer z-10 transition-colors">
                  <Play className="h-5 w-5 mr-2 fill-current" aria-hidden="true" />
                  {cameraStarting ? 'Starting camera…' : modelReady ? 'Start Exercise' : 'Loading AI model…'}
                </button>
              )}
              {status === 'paused' && (
                <span className="absolute z-10 px-4 py-2 bg-slate-900/70 text-white text-sm font-semibold rounded-lg">
                  Session paused
                </span>
              )}
            </div>
            <p id="camera-privacy-note" className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
              Your camera stays on this device — video is processed locally and never uploaded.
            </p>
          </Card>

          <Card className="lg:col-span-2 p-5 sm:p-6 flex flex-col items-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-4" id="twin-panel-title">Rehabilitation Digital Twin</h2>
            <canvas
              ref={twinRef}
              width={400}
              height={350}
              role="img"
              aria-label="Digital twin view showing the active exercise target and your tracked arm movement"
              className="border border-slate-200 dark:border-slate-700 rounded-xl bg-surface dark:bg-slate-950 w-full max-w-[400px]"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
              Reach toward the highlighted target and hold steady to complete it.
            </p>
          </Card>
        </div>

        {/* ============ CONTROLS ============ */}
        <Card className="p-5 sm:p-6">
          {status === 'completing' && saveFailed ? (
            <div className="text-center space-y-3">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                Your session could not be saved. Your exercise data is kept — please try again.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button size="lg" onClick={retrySave} loading={saving} disabled={saving}>
                  {saving ? 'Saving…' : 'Try Saving Again'}
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </div>
          ) : status === 'completing' ? (
            <div className="flex items-center justify-center gap-3 py-2">
              <LoadingState message="Saving your session…" />
            </div>
          ) : status === 'ready' ? (
            <div className="flex justify-center">
              <Button size="lg" onClick={handleStart} disabled={!modelReady || cameraStarting} className="min-w-[220px] min-h-[48px]">
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                {cameraStarting ? 'Starting camera…' : modelReady ? 'Start Exercise' : 'Loading AI model…'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              {status === 'in_progress' && (
                <Button variant="outline" size="lg" onClick={handlePause} className="min-h-[48px] min-w-[160px]">
                  <Pause className="h-5 w-5" aria-hidden="true" /> Pause
                </Button>
              )}
              {status === 'paused' && (
                <Button size="lg" onClick={handleResume} className="min-h-[48px] min-w-[160px]">
                  <Play className="h-5 w-5 fill-current" aria-hidden="true" /> Resume
                </Button>
              )}
              <Button variant="danger" size="lg" onClick={handleFinish} disabled={saving} className="min-h-[48px] min-w-[160px]">
                <Flag className="h-5 w-5" aria-hidden="true" /> Finish
              </Button>
            </div>
          )}
        </Card>

        {/* ============ COACH FEEDBACK + VOICE CONTROLS ============ */}
        <div className="bg-primary-50/60 border border-primary-100 dark:border-primary-900 p-5 sm:p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h3 className="text-xs font-bold text-primary-700 uppercase tracking-widest">AI Rehab Coach</h3>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50" aria-live="polite">{coachHint}</p>
          </div>
          {voiceSupported && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Read current hint on demand (works even with voice off) */}
              <button
                type="button"
                onClick={() => speak(coachHint, { force: true })}
                aria-label="Read the current coaching message aloud"
                title="Read aloud"
                className="p-3 bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 border border-primary-200 dark:border-primary-800 rounded-full hover:bg-primary-50 transition-colors cursor-pointer"
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              </button>
              {/* Ambient voice toggle (hints + countdown + completion). Opt-in. */}
              <button
                type="button"
                role="switch"
                aria-checked={voiceOn}
                onClick={() => setVoiceEnabled(!voiceOn) || setVoiceOn(!voiceOn)}
                aria-label="Toggle voice assistance for coaching, countdown, and completion announcements"
                title={voiceOn ? 'Voice assistance: on' : 'Voice assistance: off'}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border transition-colors cursor-pointer',
                  voiceOn
                    ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >
                {voiceOn ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
                Voice {voiceOn ? 'on' : 'off'}
              </button>
            </div>
          )}
        </div>

        {/* ============ INSTRUCTIONS ============ */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">How to do this exercise</h2>
            {voiceSupported && exercise.instructions && (
              <button
                type="button"
                onClick={() => speak(String(exercise.instructions), { force: true })}
                aria-label="Read the exercise instructions aloud"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 cursor-pointer"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" /> Read instructions aloud
              </button>
            )}
          </div>
          {exercise.instructions ? (
            <ol className="space-y-1.5 list-decimal list-inside text-sm text-slate-600 dark:text-slate-300">
              {String(exercise.instructions).split('\n').filter(Boolean).map((line, i) => (
                <li key={i}>{line.replace(/^\s*\d+\.\s*/, '')}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Follow the on-screen target: reach toward it and hold steady for the requested time.
            </p>
          )}
          {targets.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              {targets.length} target{targets.length !== 1 ? 's' : ''} in this exercise
              {maxHold != null ? ` · hold each up to ${maxHold}s` : ''} · the twin shows which target is active.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ExerciseRunnerPage;
