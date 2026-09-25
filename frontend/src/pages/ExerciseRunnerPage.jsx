import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExerciseDetail, saveSession } from '../services/api';
import { Play, Volume2, ShieldAlert, StopCircle } from 'lucide-react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const ExerciseRunnerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(100.0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [targetsHit, setTargetsHit] = useState(0);
  const [coachHint, setCoachHint] = useState("Loading AI Model...");
  const [error, setError] = useState('');
  const [modelReady, setModelReady] = useState(false);
  
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
        setError("Failed to load exercise or AI model.");
      } finally {
        setLoading(false);
      }
    };
    initialize();
    
    return () => {
      stopCamera();
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
      videoRef.current.onloadeddata = () => {
        setRunning(true);
        runningRef.current = true;
        setCoachHint("Raise your arm toward the green target!");
        currentTargetIndex.current = 0;
        anglesHistory.current = [];
        smoothedStateRef.current = null;   // fresh smoothing per session
        activeSideRef.current = null;      // re-select tracked arm
        lastVideoTime.current = -1;
        setTargetsHit(0);
        // Match the webcam box to the real stream aspect ratio so the overlay
        // skeleton lines up with the video (no stretch/crop mismatch).
        const v = videoRef.current;
        if (containerRef.current && v && v.videoWidth && v.videoHeight) {
          containerRef.current.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`;
        }
      };
    } catch (err) {
      setError('Could not access camera device. Ensure camera permissions are allowed.');
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
    
    if (ctx && exercise) {
      ctx.clearRect(0, 0, width, height);

      // Draw Grid
      ctx.strokeStyle = '#e5e7eb';
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

        const radius = 15 + Math.sin(Date.now() / 150) * 3;
        ctx.beginPath();
        ctx.arc(targetX, targetY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#065f46';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`Target ${currentTargetIndex.current + 1}`, targetX - 25, targetY - 25);
      }          let startTimeMs = performance.now();
          try {
            if (videoRef.current.readyState >= 2 && videoRef.current.currentTime !== lastVideoTime.current) {
              lastVideoTime.current = videoRef.current.currentTime;
              const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

              const lm = (results.landmarks && results.landmarks.length > 0) ? results.landmarks[0] : null;

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

            ctx.beginPath(); ctx.arc(shoulderX, shoulderY, 12, 0, 2 * Math.PI); ctx.fillStyle = '#1e3a8a'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(mappedElbowX, mappedElbowY); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 8; ctx.stroke();
            ctx.beginPath(); ctx.arc(mappedElbowX, mappedElbowY, 10, 0, 2 * Math.PI); ctx.fillStyle = '#1e3a8a'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(mappedElbowX, mappedElbowY); ctx.lineTo(handX, handY); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 6; ctx.stroke();
            ctx.beginPath(); ctx.arc(handX, handY, 8, 0, 2 * Math.PI); ctx.fillStyle = '#10b981'; ctx.fill(); 
            
            anglesHistory.current.push([dx, dy]); 
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

  useEffect(() => {
    let interval = null;
    if (running && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && running) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [running, timeLeft]);

  const handleComplete = async () => {
    stopCamera();
    try {
      const result = await saveSession({
        exercise_id: Number(id),
        duration_seconds: exercise.duration_seconds,
        avg_accuracy_score: score,
        targets_hit: targetsHit,
        total_targets: targetsHit + 1,
        joint_angle_data: anglesHistory.current
      });
      alert(`Session Completed! Score: ${result?.session?.overall_score || 100}%. Points earned: ${result?.points_earned || 50} XP.`);
      navigate('/reports');
    } catch (err) {
      console.error("Error saving session logs:", err);
      navigate('/reports');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{exercise.name}</h1>
            <p className="text-gray-500 mt-1">Difficulty level: <span className="font-semibold text-blue-600">Level {exercise.level}</span></p>
          </div>
          <div className="flex gap-6 items-center">
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-500 uppercase">Time Left</span>
              <span className="block text-2xl font-extrabold text-blue-600">{timeLeft}s</span>
            </div>
            {running && (
              <button onClick={stopCamera} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded shadow font-bold flex items-center cursor-pointer">
                <StopCircle className="w-5 h-5 mr-2" /> Stop
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Webcam Tracking</h3>
            {error && <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded text-sm text-red-700 w-full mb-4">{error}</div>}
            <div ref={containerRef} className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full transform -scale-x-100 pointer-events-none" />
              {!running && (
                <button onClick={handleStart} disabled={!modelReady} className="absolute px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 flex items-center cursor-pointer z-10">
                  <Play className="h-5 w-5 mr-2 fill-current" /> {modelReady ? "Initialize Camera" : "Loading Model..."}
                </button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rehabilitation Digital Twin</h3>
            <canvas ref={twinRef} width={400} height={350} className="border border-gray-200 rounded-lg bg-gray-50" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-100 flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest">AI Rehab Coach</h4>
            <p className="text-lg font-extrabold text-blue-950">{coachHint}</p>
          </div>
          <button onClick={() => window.speechSynthesis.speak(new SpeechSynthesisUtterance(coachHint))} className="p-3 bg-white text-blue-600 border border-blue-200 rounded-full hover:bg-blue-50 cursor-pointer">
            <Volume2 className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExerciseRunnerPage;
