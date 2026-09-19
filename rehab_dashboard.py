import cv2
import math
import numpy as np
import time
from kinematics_engine import UpperLimbKinematics
from vision_tracker import GesturePoseTracker

class RehabCoach:
    def __init__(self, stall_threshold_sec=2.0, min_display_sec=4.5):
        self.stall_threshold_sec = stall_threshold_sec
        self.min_display_sec = min_display_sec  # Keeps prompt on screen for at least 4.5s
        self.last_pos = None
        self.last_move_time = time.time()
        self.banner_trigger_time = 0.0
        self.is_displaying_guidance = False
        
        self.cached_direction = ""
        self.cached_motivation = ""
        self.prompt_idx = 0

        self.motivational_phrases = [
            "You are doing great! Keep pushing!",
            "Almost there! Just a little more stretch!",
            "Great effort! You can do it!",
            "Steady pace! Keep reaching for the goal!",
            "Every movement builds your strength! Keep going!"
        ]

    def update(self, current_hand_pos, target_pos, ideal_th1, ideal_th2, actual_th1, actual_th2, is_reached):
        current_time = time.time()

        if is_reached:
            self.last_move_time = current_time
            self.is_displaying_guidance = False
            return {
                "is_active": False,
                "is_reached": True,
                "direction_text": "EXCELLENT! Target Reached!",
                "motivational_text": "Awesome job! Hold for recovery credit!",
                "dx": 0, "dy": 0
            }

        # Check movement delta (in cm)
        if self.last_pos is None:
            self.last_pos = np.array(current_hand_pos, dtype=float)
            self.last_move_time = current_time
        else:
            displacement = np.linalg.norm(np.array(current_hand_pos) - self.last_pos)
            if displacement > 3.0:  # Noticeable movement threshold
                self.last_pos = np.array(current_hand_pos, dtype=float)
                # Only reset timer if guidance banner is not actively showing
                if not self.is_displaying_guidance:
                    self.last_move_time = current_time

        stall_duration = current_time - self.last_move_time

        # Trigger stall guidance when stationary
        if stall_duration >= self.stall_threshold_sec and not self.is_displaying_guidance:
            self.is_displaying_guidance = True
            self.banner_trigger_time = current_time
            self.prompt_idx = (self.prompt_idx + 1) % len(self.motivational_phrases)
            self.cached_motivation = self.motivational_phrases[self.prompt_idx]

        # Calculate current real-time guidance direction
        dx = target_pos[0] - current_hand_pos[0]
        dy = target_pos[1] - current_hand_pos[1]
        d_th1 = ideal_th1 - actual_th1
        d_th2 = ideal_th2 - actual_th2

        directions = []
        if dy > 5.0:
            directions.append("Lift Arm UP")
        elif dy < -5.0:
            directions.append("Lower Arm Down")

        if dx > 5.0:
            directions.append("Extend FORWARD")
        elif dx < -5.0:
            directions.append("Pull Hand Inward")

        if not directions:
            if abs(d_th1) > 8.0:
                directions.append("Adjust Shoulder (+{:.0f}*)".format(d_th1))
            if abs(d_th2) > 8.0:
                directions.append("Adjust Elbow (+{:.0f}*)".format(d_th2))

        self.cached_direction = "Hint: " + (" & ".join(directions) if directions else "Reach toward the target")

        # Check if minimum display time (4.5s) has expired
        time_since_trigger = current_time - self.banner_trigger_time
        if self.is_displaying_guidance and time_since_trigger >= self.min_display_sec:
            # If patient is now moving smoothly, clear guidance
            if stall_duration < self.stall_threshold_sec:
                self.is_displaying_guidance = False

        return {
            "is_active": self.is_displaying_guidance,
            "is_reached": False,
            "direction_text": self.cached_direction,
            "motivational_text": self.cached_motivation,
            "dx": dx,
            "dy": dy
        }

def draw_dashboard(tracker, arm_model):
    exercise_targets = [
        {"name": "Exercise 1: Forward Reach (Cup)", "x": 38.0, "y": 15.0},
        {"name": "Exercise 2: Overhead Elevation",  "x": 20.0, "y": 42.0},
        {"name": "Exercise 3: Mid-Chest Flexion",    "x": 25.0, "y": -5.0},
        {"name": "Exercise 4: Extended Reach",       "x": 48.0, "y": 20.0}
    ]
    target_idx = 0

    tracker.init_camera()
    # 2.0s to detect stall, 4.5s guaranteed display time so patient can comfortably read it!
    coach = RehabCoach(stall_threshold_sec=2.0, min_display_sec=4.5)

    print("=" * 70)
    print("AI HEALTHCARE: STROKE REHABILITATION KINEMATICS SYSTEM (PERSISTENT COACH)")
    print("Controls:")
    print("  's' : Toggle LIVE WEBCAM <-> SYNTHETIC SIMULATION")
    print("  't' : Cycle to next Rehabilitation Exercise Target")
    print("  'q' : Quit application")
    print("=" * 70)

    window_name = "AI HealthCare: Gesture Rehabilitation System (Mid-Review)"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 1280, 720)

    fps_time = time.time()
    fps = 30.0

    disp_th1 = 30.0
    disp_th2 = 0.0

    reps_completed = 0
    in_target_zone = False
    target_hold_start = 0
    pulse_timer = 0.0

    while True:
        curr_time = time.time()
        dt = curr_time - fps_time
        fps_time = curr_time
        if dt > 0:
            fps = 0.9 * fps + 0.1 * (1.0 / dt)

        pulse_timer += 0.15

        frame, data = tracker.get_frame_and_landmarks()
        th1_actual = data["theta1"]
        th2_actual = data["theta2"]

        disp_th1 = 0.75 * th1_actual + 0.25 * disp_th1
        disp_th2 = 0.75 * th2_actual + 0.25 * disp_th2

        target = exercise_targets[target_idx]
        target_x, target_y = target["x"], target["y"]

        metrics = arm_model.evaluate_rehabilitation_metrics(
            actual_theta1=disp_th1,
            actual_theta2=disp_th2,
            target_x=target_x,
            target_y=target_y
        )
        fk_actual = arm_model.forward_kinematics(disp_th1, disp_th2)
        act_hd = fk_actual["hand"]
        
        dist_to_target = np.linalg.norm(act_hd[0:2] - np.array([target_x, target_y]))
        is_reached = (dist_to_target <= 8.5) or (metrics["accuracy_score"] >= 82.0)

        # Coach Analysis with guaranteed display duration
        coach_feedback = coach.update(
            current_hand_pos=act_hd[0:2],
            target_pos=[target_x, target_y],
            ideal_th1=metrics["ideal_theta1"],
            ideal_th2=metrics["ideal_theta2"],
            actual_th1=disp_th1,
            actual_th2=disp_th2,
            is_reached=is_reached
        )

        # Repetition Counting
        if is_reached:
            if not in_target_zone:
                in_target_zone = True
                target_hold_start = time.time()
            elif time.time() - target_hold_start > 1.2:
                reps_completed += 1
                target_hold_start = time.time() + 100.0
        else:
            in_target_zone = False

        # Dashboard Canvas (720 x 1280)
        canvas = np.zeros((720, 1280, 3), dtype=np.uint8)
        canvas[:] = (24, 25, 30)

        # ----------------------------------------------------------------------
        # Left Panel: Patient Vision Feed (580 x 430)
        # ----------------------------------------------------------------------
        h_cam, w_cam = 430, 580
        cam_resized = cv2.resize(frame, (w_cam, h_cam))
        canvas[90:90+h_cam, 40:40+w_cam] = cam_resized
        cv2.rectangle(canvas, (40, 90), (40+w_cam, 90+h_cam), (70, 75, 90), 2)

        mode_tag = "SYNTHETIC DEMO" if data["is_synthetic"] else "LIVE WEBCAM ACTIVE"
        mode_color = (0, 230, 255) if not data["is_synthetic"] else (255, 200, 0)
        cv2.putText(canvas, "Patient Visual Input: [{}]".format(mode_tag), (45, 75),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, mode_color, 2)

        # ----------------------------------------------------------------------
        # Right Panel: 2D Kinematic Digital Twin (580 x 430)
        # ----------------------------------------------------------------------
        kin_x, kin_y, kin_w, kin_h = 660, 90, 580, 430
        cv2.rectangle(canvas, (kin_x, kin_y), (kin_x+kin_w, kin_y+kin_h), (35, 38, 48), -1)
        cv2.rectangle(canvas, (kin_x, kin_y), (kin_x+kin_w, kin_y+kin_h), (70, 75, 90), 2)

        cv2.putText(canvas, "Digital Twin Kinematic Frame (Unit 1 & Unit 2)", (kin_x + 10, 75),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (100, 255, 100), 2)

        # Digital Twin Origin on Screen
        origin_x = kin_x + 150
        origin_y = kin_y + 280
        scale = 5.5  # pixels per cm

        # Base Axes
        cv2.arrowedLine(canvas, (origin_x, origin_y), (origin_x + 60, origin_y), (0, 0, 255), 2, tipLength=0.2)
        cv2.putText(canvas, "X0", (origin_x + 65, origin_y + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1)
        cv2.arrowedLine(canvas, (origin_x, origin_y), (origin_x, origin_y - 60), (0, 255, 0), 2, tipLength=0.2)
        cv2.putText(canvas, "Y0", (origin_x - 5, origin_y - 68), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)

        # Target Coordinates on Screen
        tg_screen_x = int(origin_x + target_x * scale)
        tg_screen_y = int(origin_y - target_y * scale)

        # Target Marker
        tg_color = (0, 255, 100) if is_reached else (0, 215, 255)
        tg_radius = 20 if is_reached else (14 + int(2 * math.sin(pulse_timer)))
        cv2.circle(canvas, (tg_screen_x, tg_screen_y), tg_radius, tg_color, 2 if not is_reached else 3)
        cv2.circle(canvas, (tg_screen_x, tg_screen_y), 5, tg_color, -1)
        cv2.putText(canvas, "Target ({:.0f},{:.0f})".format(target_x, target_y),
                    (tg_screen_x + 15, tg_screen_y + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, tg_color, 1)

        # Ideal Arm Posture (Gray Guide)
        ideal_th1 = metrics["ideal_theta1"]
        ideal_th2 = metrics["ideal_theta2"]
        id_fk = arm_model.forward_kinematics(ideal_th1, ideal_th2)
        id_el = id_fk["elbow"]
        id_hd = id_fk["hand"]
        id_el_s = (int(origin_x + id_el[0] * scale), int(origin_y - id_el[1] * scale))
        id_hd_s = (int(origin_x + id_hd[0] * scale), int(origin_y - id_hd[1] * scale))

        cv2.line(canvas, (origin_x, origin_y), id_el_s, (75, 75, 85), 2, cv2.LINE_AA)
        cv2.line(canvas, id_el_s, id_hd_s, (75, 75, 85), 2, cv2.LINE_AA)

        # Actual Arm Posture (Patient FK)
        act_el = fk_actual["elbow"]
        act_el_s = (int(origin_x + act_el[0] * scale), int(origin_y - act_el[1] * scale))
        act_hd_s = (int(origin_x + act_hd[0] * scale), int(origin_y - act_hd[1] * scale))

        # Links
        cv2.line(canvas, (origin_x, origin_y), act_el_s, (0, 220, 100), 4, cv2.LINE_AA)
        cv2.line(canvas, act_el_s, act_hd_s, (0, 180, 255), 4, cv2.LINE_AA)

        # Pulsing Guidance Arrow towards target (Visible when coach guidance is active)
        if coach_feedback["is_active"] and not is_reached:
            arrow_color = (0, 230, 255)
            cv2.arrowedLine(canvas, act_hd_s, (tg_screen_x, tg_screen_y), arrow_color, 3, tipLength=0.25)
        else:
            cv2.line(canvas, act_hd_s, (tg_screen_x, tg_screen_y), (90, 95, 110), 1, cv2.LINE_AA)

        # Joint Nodes
        cv2.circle(canvas, (origin_x, origin_y), 8, (255, 255, 255), -1)  # Shoulder
        cv2.circle(canvas, act_el_s, 7, (0, 255, 255), -1)               # Elbow
        cv2.circle(canvas, act_hd_s, 9, (0, 50, 255) if not is_reached else (0, 255, 100), -1) # Wrist
        cv2.circle(canvas, act_hd_s, 13, (255, 255, 255), 2)

        # ----------------------------------------------------------------------
        # AI Rehabilitation Coach Motivation & Guidance Banner (Persistent Display)
        # ----------------------------------------------------------------------
        if is_reached:
            cv2.rectangle(canvas, (kin_x + 60, kin_y + 15), (kin_x + 520, kin_y + 65), (0, 160, 70), -1)
            cv2.putText(canvas, "TARGET REACHED! EXCELLENT!", (kin_x + 95, kin_y + 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
        elif coach_feedback["is_active"]:
            # Display Persistent Guidance Box (Guaranteed 4.5 seconds visibility)
            cv2.rectangle(canvas, (kin_x + 20, kin_y + 15), (kin_x + 560, kin_y + 70), (45, 45, 95), -1)
            cv2.rectangle(canvas, (kin_x + 20, kin_y + 15), (kin_x + 560, kin_y + 70), (0, 215, 255), 2)
            cv2.putText(canvas, coach_feedback["direction_text"], (kin_x + 35, kin_y + 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.62, (0, 255, 255), 2)
            cv2.putText(canvas, coach_feedback["motivational_text"], (kin_x + 35, kin_y + 62),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (100, 255, 180), 1)

        cv2.putText(canvas, "Wrist Dist: {:.1f} cm".format(dist_to_target),
                    (kin_x + 15, kin_y + kin_h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 215, 230), 1)

        # ----------------------------------------------------------------------
        # Bottom Telemetry Panel (D-H Parameters & Recovery Scores)
        # ----------------------------------------------------------------------
        bot_y = 540
        cv2.rectangle(canvas, (40, bot_y), (1240, 700), (32, 34, 42), -1)
        cv2.rectangle(canvas, (40, bot_y), (1240, 700), (70, 75, 90), 2)

        # Section 1: Target Info & Live Coach Status
        cv2.putText(canvas, target["name"], (60, bot_y + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 215, 255), 2)
        cv2.putText(canvas, "Prescribed Target: ({:.1f} cm, {:.1f} cm)".format(target_x, target_y),
                    (60, bot_y + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 210), 1)
        cv2.putText(canvas, "Ideal Angles(IK): th1={:.1f}*, th2={:.1f}*".format(ideal_th1, ideal_th2),
                    (60, bot_y + 78), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 210), 1)
        cv2.putText(canvas, "Patient Actual:   th1={:.1f}*, th2={:.1f}*".format(th1_actual, th2_actual),
                    (60, bot_y + 101), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 210), 1)

        # Bottom Coach Prompt (Always visible)
        coach_banner = coach_feedback["motivational_text"] if not is_reached else "Repetition Complete! Fantastic!"
        cv2.putText(canvas, "Coach: " + coach_banner, (60, bot_y + 135),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 240, 160), 2)

        # Section 2: D-H Parameter Table (Unit 2)
        cv2.putText(canvas, "D-H Parameter Table (Unit 2)", (480, bot_y + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (140, 220, 255), 2)
        cv2.putText(canvas, "Joint | theta (deg) | d(cm) | a(cm) | alpha", (480, bot_y + 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.46, (180, 190, 200), 1)
        cv2.putText(canvas, "  1   |   {:6.1f}*  |  0.0  | {:4.1f}  |  0.0*".format(th1_actual, arm_model.L1),
                    (480, bot_y + 78), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (0, 255, 120), 1)
        cv2.putText(canvas, "  2   |   {:6.1f}*  |  0.0  | {:4.1f}  |  0.0*".format(th2_actual, arm_model.L2),
                    (480, bot_y + 101), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (0, 255, 120), 1)
        cv2.putText(canvas, "Chained HTM: T0_2 = A1(th1) * A2(th2)", (480, bot_y + 135),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 100), 1)

        # Section 3: Rehabilitation Motor Recovery Score & Repetitions
        score = metrics["accuracy_score"]
        score_color = (0, 255, 100) if score >= 75.0 else ((0, 215, 255) if score >= 50.0 else (0, 80, 255))

        cv2.putText(canvas, "Rehab Motor Score", (920, bot_y + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(canvas, "{:.1f}%".format(score), (920, bot_y + 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.4, score_color, 3)
        cv2.putText(canvas, "Reps Completed: {:d}".format(reps_completed),
                    (920, bot_y + 110), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 255, 255), 2)
        cv2.putText(canvas, "Status: {}".format("GUIDING" if coach_feedback["is_active"] else "ACTIVE"),
                    (920, bot_y + 135), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 215, 255) if coach_feedback["is_active"] else (0, 255, 100), 1)

        # Top Header
        cv2.putText(canvas, "AI in HealthCare: Gesture-Based Stroke Rehabilitation System (Mid-Review)",
                    (40, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.72, (255, 255, 255), 2)
        cv2.putText(canvas, "Press 's' to Toggle Camera/Simulation | 't' for Next Exercise | 'q' to Quit",
                    (40, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 170, 180), 1)
        cv2.putText(canvas, "FPS: {:.1f}".format(fps), (1170, 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 100), 2)

        cv2.imshow(window_name, canvas)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('t'):
            target_idx = (target_idx + 1) % len(exercise_targets)
            in_target_zone = False
            print("[Info] Switched to Target: {}".format(exercise_targets[target_idx]["name"]))
        elif key == ord('s'):
            tracker.toggle_mode()

    tracker.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    arm = UpperLimbKinematics(L1=30.0, L2=25.0)
    tracker = GesturePoseTracker(mode="camera")
    draw_dashboard(tracker, arm)
