"""
Vision & Gesture Tracking Interface (Precision Relative Joint Angle & Sign Engine)
AI in HealthCare: Gesture-Based Stroke Rehabilitation System

Features:
  - Signed relative angle calculations (Theta2 = phi_forearm - phi_upper) ensuring 100% wrist Cartesian alignment
  - MediaPipe Tasks in VIDEO streaming mode (with internal temporal tracking)
  - Exponential Moving Average (EMA) Landmark & Angle Anti-Jitter Filter
  - DirectShow camera pipeline with zero-latency frame buffering
"""

import cv2
import math
import os
import time
import numpy as np

class TemporalSmoother:
    """Exponential Moving Average (EMA) filter to eliminate keypoint jitter."""
    def __init__(self, alpha=0.65):
        self.alpha = alpha
        self.smoothed_val = None

    def update(self, val):
        if self.smoothed_val is None:
            self.smoothed_val = np.array(val, dtype=float)
        else:
            self.smoothed_val = self.alpha * np.array(val, dtype=float) + (1.0 - self.alpha) * self.smoothed_val
        return self.smoothed_val

    def reset(self):
        self.smoothed_val = None

class GesturePoseTracker:
    def __init__(self, mode="camera", model_path="pose_landmarker_lite.task"):
        self.mode = mode
        self.model_path = model_path
        self.detector = None
        self.cap = None
        self.synthetic_time = 0.0
        self.start_time = time.time()

        # Landmark and angle smoothers – lower alpha for stronger EMA smoothing (reduces jitter)
        self.smooth_sh = TemporalSmoother(alpha=0.4)
        self.smooth_el = TemporalSmoother(alpha=0.45)
        self.smooth_wr = TemporalSmoother(alpha=0.45)
        self.smooth_th1 = TemporalSmoother(alpha=0.5)
        self.smooth_th2 = TemporalSmoother(alpha=0.5)

        # Initialize MediaPipe Tasks PoseLandmarker
        self._init_mediapipe_detector()

    def _init_mediapipe_detector(self):
        try:
            import mediapipe as mp
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision

            if not os.path.exists(self.model_path):
                script_dir = os.path.dirname(os.path.abspath(__file__))
                alt_path = os.path.join(script_dir, "pose_landmarker_lite.task")
                if os.path.exists(alt_path):
                    self.model_path = alt_path

            if os.path.exists(self.model_path):
                base_options = python.BaseOptions(model_asset_path=self.model_path)
                options = vision.PoseLandmarkerOptions(
                    base_options=base_options,
                    running_mode=vision.RunningMode.VIDEO,
                    num_poses=1,
                    min_pose_detection_confidence=0.5,
                    min_pose_presence_confidence=0.5,
                    min_tracking_confidence=0.5,
                    output_segmentation_masks=False
                )
                self.detector = vision.PoseLandmarker.create_from_options(options)
                print("[Info] MediaPipe PoseLandmarker initialized in high-speed VIDEO mode.")
            else:
                print("[Warning] pose_landmarker_lite.task not found.")
        except Exception as e:
            print("[Warning] Could not initialize MediaPipe detector:", e)

    def init_camera(self, camera_index=0):
        """Initializes OpenCV video capture with DirectShow backend."""
        if self.mode == "synthetic":
            return True

        if self.cap is not None and self.cap.isOpened():
            return True

        self.cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
        if not self.cap.isOpened():
            self.cap = cv2.VideoCapture(camera_index)

        if not self.cap.isOpened():
            print("[Warning] Webcam could not be opened. Falling back to Synthetic Mode.")
            self.mode = "synthetic"
            return False

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        # Increase capture FPS for smoother motion (if camera supports it)
        self.cap.set(cv2.CAP_PROP_FPS, 120)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        self.mode = "camera"
        self.start_time = time.time()
        print("[Info] Precision camera tracking stream initialized.")
        return True

    def get_frame_and_landmarks(self):
        """
        Captures frame and computes exact signed joint angles (theta1, theta2)
        mapping directly to 2D wrist Cartesian space.
        """
        if self.mode == "synthetic":
            return self._generate_synthetic_pose()

        if self.cap is None or not self.cap.isOpened():
            if not self.init_camera():
                return self._generate_synthetic_pose()

        success, frame = self.cap.read()
        if not success or frame is None:
            return self._generate_synthetic_pose()

        # Flip horizontally for natural mirror view (commented out to preserve coordinate mapping)
        # frame = cv2.flip(frame, 1)
        
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        timestamp_ms = int((time.time() - self.start_time) * 1000)

        # MediaPipe Video Mode Processing
        if self.detector is not None:
            try:
                import mediapipe as mp
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                detection_result = self.detector.detect_for_video(mp_image, timestamp_ms)

                if detection_result and detection_result.pose_landmarks and len(detection_result.pose_landmarks) > 0:
                    landmarks = detection_result.pose_landmarks[0]

                    # 12=R_Shoulder, 14=R_Elbow, 16=R_Wrist
                    # 11=L_Shoulder, 13=L_Elbow, 15=L_Wrist
                    r_sh, r_el, r_wr = landmarks[12], landmarks[14], landmarks[16]
                    l_sh, l_el, l_wr = landmarks[11], landmarks[13], landmarks[15]

                    # Force use of the right arm landmarks (shoulder=12, elbow=14, wrist=16)
                    r_sh, r_el, r_wr = landmarks[12], landmarks[14], landmarks[16]
                    sh, el, wr = r_sh, r_el, r_wr
                    arm_name = "Right Arm"

                    # Convert to pixel space
                    raw_sh = np.array([sh.x * w, sh.y * h, sh.z * w])
                    raw_el = np.array([el.x * w, el.y * h, el.z * w])
                    raw_wr = np.array([wr.x * w, wr.y * h, wr.z * w])

                    # Smooth Landmarks
                    p_sh = self.smooth_sh.update(raw_sh)
                    p_el = self.smooth_el.update(raw_el)
                    p_wr = self.smooth_wr.update(raw_wr)
                    # Debug: print wrist Y coordinate (lower means higher on screen)
                    if self.mode == "camera":
                        print(f"[Debug] Wrist pixel Y: {p_wr[1]:.1f}")
                    # Draw Anatomical Skeleton on Video Feed
                    cv2.circle(frame, (int(p_sh[0]), int(p_sh[1])), 9, (0, 255, 0), -1)   # Shoulder
                    cv2.circle(frame, (int(p_el[0]), int(p_el[1])), 9, (0, 255, 255), -1) # Elbow
                    cv2.circle(frame, (int(p_wr[0]), int(p_wr[1])), 10, (0, 140, 255), -1) # Wrist / Hand
                    cv2.circle(frame, (int(p_wr[0]), int(p_wr[1])), 14, (255, 255, 255), 2)

                    cv2.line(frame, (int(p_sh[0]), int(p_sh[1])), (int(p_el[0]), int(p_el[1])), (0, 255, 0), 3, cv2.LINE_AA)
                    cv2.line(frame, (int(p_el[0]), int(p_el[1])), (int(p_wr[0]), int(p_wr[1])), (0, 255, 255), 3, cv2.LINE_AA)

                    # ----------------------------------------------------------
                    # UNIT 1 & UNIT 2 PRECISION ANGLE DERIVATION (WITH SIGN)
                    # ----------------------------------------------------------
                    # Vectors in Cartesian coordinates (Y-axis points upwards):
                    v_upper = np.array([p_el[0] - p_sh[0], -(p_el[1] - p_sh[1])])
                    v_forearm = np.array([p_wr[0] - p_el[0], -(p_wr[1] - p_el[1])])
                    # Absolute orientation of Upper Arm:
                    phi_upper = math.atan2(v_upper[1], v_upper[0])
                    # Absolute orientation of Forearm:
                    phi_forearm = math.atan2(v_forearm[1], v_forearm[0])

                    # Theta 1 (Shoulder Elevation):
                    raw_theta1 = (math.degrees(phi_upper) + 360.0) % 360.0

                    # Theta 2 (Elbow Relative Joint Angle with exact sign!):
                    # Relative angle between Forearm and Upper Arm
                    diff_rad = phi_forearm - phi_upper
                    # Normalize to [-pi, +pi]
                    diff_rad = (diff_rad + math.pi) % (2.0 * math.pi) - math.pi
                    raw_theta2 = math.degrees(diff_rad)

                    # Smooth Angles
                    theta1 = float(self.smooth_th1.update([raw_theta1])[0])
                    theta2 = float(self.smooth_th2.update([raw_theta2])[0])

                    cv2.putText(frame, "Active: {} [Wrist Locked]".format(arm_name), (20, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.62, (0, 255, 100), 2)

                    return frame, {
                        "shoulder": p_sh,
                        "elbow": p_el,
                        "wrist": p_wr,
                        "theta1": theta1,
                        "theta2": theta2,
                        "is_synthetic": False,
                        "detected": True
                    }
            except Exception as e:
                print("[Error during detection]:", e)

        # Fallback prompt when patient not in camera frame
        cv2.putText(frame, "Live Camera Active: Please step in view", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 215, 255), 2)
        cv2.putText(frame, "Raise arm to track shoulder & wrist", (20, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)

        return frame, {
            "shoulder": np.array([220.0, 240.0, 0.0]),
            "elbow": np.array([320.0, 240.0, 0.0]),
            "wrist": np.array([400.0, 240.0, 0.0]),
            "theta1": 25.0,
            "theta2": 30.0,
            "is_synthetic": False,
            "detected": False
        }

    def _generate_synthetic_pose(self):
        """Generates realistic synthetic rehabilitation movements for demonstration and testing."""
        self.synthetic_time += 0.04
        theta1 = 30.0 + 25.0 * math.sin(self.synthetic_time * 1.0)
        theta2 = 40.0 + 30.0 * math.sin(self.synthetic_time * 1.3)

        h, w = 480, 640
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        frame[:] = (32, 34, 40)

        p_sh = np.array([200.0, 260.0, 0.0])
        L1, L2 = 130.0, 110.0

        th1_rad = math.radians(theta1)
        th2_rad = math.radians(theta2)

        p_el = p_sh + np.array([L1 * math.cos(th1_rad), -L1 * math.sin(th1_rad), 0.0])
        total_th = th1_rad + th2_rad
        p_wr = p_el + np.array([L2 * math.cos(total_th), -L2 * math.sin(total_th), 0.0])

        # Draw Skeleton
        cv2.circle(frame, (int(p_sh[0]), int(p_sh[1])), 10, (0, 255, 120), -1)
        cv2.circle(frame, (int(p_el[0]), int(p_el[1])), 10, (255, 200, 0), -1)
        cv2.circle(frame, (int(p_wr[0]), int(p_wr[1])), 10, (0, 100, 255), -1)
        cv2.line(frame, (int(p_sh[0]), int(p_sh[1])), (int(p_el[0]), int(p_el[1])), (0, 255, 120), 4, cv2.LINE_AA)
        cv2.line(frame, (int(p_el[0]), int(p_el[1])), (int(p_wr[0]), int(p_wr[1])), (255, 200, 0), 4, cv2.LINE_AA)

        cv2.putText(frame, "[SYNTHETIC SIMULATION MODE]", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)
        cv2.putText(frame, "Press 's' to switch to Live Webcam", (20, 65),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 190, 200), 1)

        return frame, {
            "shoulder": p_sh,
            "elbow": p_el,
            "wrist": p_wr,
            "theta1": theta1,
            "theta2": theta2,
            "is_synthetic": True,
            "detected": True
        }

    def toggle_mode(self):
        if self.mode == "camera":
            self.mode = "synthetic"
            if self.cap and self.cap.isOpened():
                self.cap.release()
                self.cap = None
            print("[Mode] Switched to SYNTHETIC SIMULATION.")
        else:
            self.mode = "camera"
            self.smooth_sh.reset()
            self.smooth_el.reset()
            self.smooth_wr.reset()
            self.smooth_th1.reset()
            self.smooth_th2.reset()
            self.init_camera()
            print("[Mode] Switched to LIVE WEBCAM.")
        return self.mode

    def release(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
            self.cap = None
