"""
Kinematics Engine for NeuroMotion AI - Gesture-Based Stroke Rehabilitation System
Syllabus Alignment:
  - Unit 1: Vectors, Matrices, Rigid Body Transformations, Homogeneous Transformation Matrix (4x4)
  - Unit 2: Forward Kinematics (FK), Inverse Kinematics (IK), D-H Parameters
  - Unit 3: Jacobian Matrix, Differential Kinematics, Velocity Analysis, Singularity Detection
"""

import math
import numpy as np

# ==============================================================================
# UNIT 1: MATHEMATICAL FOUNDATIONS & RIGID BODY TRANSFORMATIONS
# ==============================================================================

def vector_magnitude(v):
    """Computes Euclidean norm of vector v."""
    return np.linalg.norm(v)

def unit_vector(v):
    """Computes unit direction vector."""
    norm = vector_magnitude(v)
    if norm < 1e-9:
        return np.zeros_like(v)
    return v / norm

def compute_angle_between_vectors(v1, v2):
    """
    Computes angle (in degrees) between two 3D vectors using dot product:
    cos(theta) = (v1 . v2) / (||v1|| * ||v2||)
    """
    u1 = unit_vector(v1)
    u2 = unit_vector(v2)
    dot = np.clip(np.dot(u1, u2), -1.0, 1.0)
    return math.degrees(math.acos(dot))

def rot_x(theta_rad):
    """3x3 Rotation matrix around X-axis."""
    c = math.cos(theta_rad)
    s = math.sin(theta_rad)
    return np.array([
        [1.0, 0.0,  0.0],
        [0.0,   c,   -s],
        [0.0,   s,    c]
    ])

def rot_y(theta_rad):
    """3x3 Rotation matrix around Y-axis."""
    c = math.cos(theta_rad)
    s = math.sin(theta_rad)
    return np.array([
        [  c, 0.0,   s],
        [0.0, 1.0, 0.0],
        [ -s, 0.0,   c]
    ])

def rot_z(theta_rad):
    """3x3 Rotation matrix around Z-axis."""
    c = math.cos(theta_rad)
    s = math.sin(theta_rad)
    return np.array([
        [  c,  -s, 0.0],
        [  s,   c, 0.0],
        [0.0, 0.0, 1.0]
    ])

def homogeneous_transform_matrix(R, d):
    """
    Constructs a 4x4 Homogeneous Transformation Matrix (HTM):
    T = [[R,  d],
         [0,  1]]
    where R is 3x3 rotation matrix, d is 3x1 translation vector.
    """
    T = np.eye(4)
    T[0:3, 0:3] = R
    T[0:3, 3] = d
    return T


# ==============================================================================
# UNIT 2: FORWARD KINEMATICS & DENAVIT-HARTENBERG (D-H) MODELING
# ==============================================================================

def dh_transformation_matrix(theta_rad, d, a, alpha_rad):
    """
    Standard Denavit-Hartenberg (D-H) 4x4 Transformation Matrix:
    A_i = Rot_z(theta_i) * Trans_z(d_i) * Trans_x(a_i) * Rot_x(alpha_i)

    Parameters:
      theta_rad : Joint angle (rotation about z_{i-1})
      d         : Joint distance / link offset (translation along z_{i-1})
      a         : Link length (translation along x_i)
      alpha_rad : Link twist (rotation about x_i)
    """
    ct = math.cos(theta_rad)
    st = math.sin(theta_rad)
    ca = math.cos(alpha_rad)
    sa = math.sin(alpha_rad)

    A = np.array([
        [ct, -st * ca,  st * sa, a * ct],
        [st,  ct * ca, -ct * sa, a * st],
        [0.0,      sa,       ca,      d],
        [0.0,     0.0,      0.0,    1.0]
    ])
    return A


class UpperLimbKinematics:
    """
    Kinematic model of the human arm / 2-DOF rehabilitation manipulator:
      - Link 1: Upper Arm (Shoulder -> Elbow) with length L1
      - Link 2: Forearm (Elbow -> Wrist/Hand) with length L2
    """
    def __init__(self, L1=30.0, L2=25.0):
        """
        L1: Upper arm length (in cm or normalized units)
        L2: Forearm length (in cm or normalized units)
        """
        self.L1 = float(L1)
        self.L2 = float(L2)

    def get_dh_table(self, theta1_deg, theta2_deg):
        """
        Returns the D-H parameter table:
        Row 1 (Joint 1 - Shoulder): theta1, d=0, a=L1, alpha=0
        Row 2 (Joint 2 - Elbow):    theta2, d=0, a=L2, alpha=0
        """
        th1_rad = math.radians(theta1_deg)
        th2_rad = math.radians(theta2_deg)
        
        dh_table = [
            {"joint": 1, "theta_rad": th1_rad, "theta_deg": theta1_deg, "d": 0.0, "a": self.L1, "alpha_rad": 0.0, "alpha_deg": 0.0},
            {"joint": 2, "theta_rad": th2_rad, "theta_deg": theta2_deg, "d": 0.0, "a": self.L2, "alpha_rad": 0.0, "alpha_deg": 0.0}
        ]
        return dh_table

    def forward_kinematics(self, theta1_deg, theta2_deg):
        """
        Computes Forward Kinematics (FK) using D-H transformation matrices:
        T0_1 = A1
        T0_2 = A1 * A2
        
        Returns:
          shoulder_pos : (0, 0, 0)
          elbow_pos    : (x1, y1, z1)
          hand_pos     : (x2, y2, z2)
          T0_1         : 4x4 matrix for Shoulder -> Elbow
          T0_2         : 4x4 matrix for Shoulder -> Hand
        """
        th1_rad = math.radians(theta1_deg)
        th2_rad = math.radians(theta2_deg)

        # Transformation for Link 1 (Upper Arm)
        A1 = dh_transformation_matrix(th1_rad, d=0.0, a=self.L1, alpha_rad=0.0)
        # Transformation for Link 2 (Forearm)
        A2 = dh_transformation_matrix(th2_rad, d=0.0, a=self.L2, alpha_rad=0.0)

        # Chained Homogeneous Transformations
        T0_1 = A1
        T0_2 = np.dot(A1, A2)

        shoulder_pos = np.array([0.0, 0.0, 0.0])
        elbow_pos = T0_1[0:3, 3]
        hand_pos = T0_2[0:3, 3]

        return {
            "shoulder": shoulder_pos,
            "elbow": elbow_pos,
            "hand": hand_pos,
            "T0_1": T0_1,
            "T0_2": T0_2
        }

    # ==========================================================================
    # UNIT 2: INVERSE KINEMATICS (IK) FOR STROKE REHABILITATION TARGETS
    # ==========================================================================
    def inverse_kinematics(self, target_x, target_y, elbow_up=True):
        """
        Computes analytical/geometric Inverse Kinematics for reaching a target (X, Y):
        Using Law of Cosines:
          r^2 = X^2 + Y^2
          cos(theta2) = (r^2 - L1^2 - L2^2) / (2 * L1 * L2)
          theta1 = atan2(Y, X) - atan2(L2*sin(theta2), L1 + L2*cos(theta2))
          
        Returns:
          (theta1_deg, theta2_deg, reachable_flag)
        """
        r_sq = target_x**2 + target_y**2
        r = math.sqrt(r_sq)

        # Reachability / Workspace Boundary Check
        max_reach = self.L1 + self.L2
        min_reach = abs(self.L1 - self.L2)

        if r > max_reach:
            # Clamping to workspace boundary for rehabilitation assistance
            scale = max_reach / (r + 1e-9)
            target_x *= scale
            target_y *= scale
            r_sq = target_x**2 + target_y**2
            reachable = False
        elif r < min_reach:
            scale = min_reach / (r + 1e-9)
            target_x *= scale
            target_y *= scale
            r_sq = target_x**2 + target_y**2
            reachable = False
        else:
            reachable = True

        # Law of cosines for theta2
        cos_theta2 = (r_sq - self.L1**2 - self.L2**2) / (2.0 * self.L1 * self.L2)
        cos_theta2 = np.clip(cos_theta2, -1.0, 1.0)

        # Elbow configuration (Up vs Down)
        if elbow_up:
            sin_theta2 = math.sqrt(max(0.0, 1.0 - cos_theta2**2))
        else:
            sin_theta2 = -math.sqrt(max(0.0, 1.0 - cos_theta2**2))

        theta2_rad = math.atan2(sin_theta2, cos_theta2)

        # Theta 1 calculation
        k1 = self.L1 + self.L2 * cos_theta2
        k2 = self.L2 * sin_theta2
        gamma = math.atan2(target_y, target_x)
        alpha = math.atan2(k2, k1)
        theta1_rad = gamma - alpha

        theta1_deg = (math.degrees(theta1_rad) + 360.0) % 360.0
        theta2_deg = math.degrees(theta2_rad)

        return theta1_deg, theta2_deg, reachable

    # ==========================================================================
    # REHABILITATION ASSESSMENT & MOTOR RECOVERY EVALUATION
    # ==========================================================================
    def evaluate_rehabilitation_metrics(self, actual_theta1, actual_theta2, target_x, target_y):
        """
        Compares patient's actual arm posture against ideal prescribed IK angles.
        Returns:
          - ideal_theta1, ideal_theta2
          - theta1_error, theta2_error
          - position_error (Cartesian distance in cm)
          - accuracy_score (0 - 100%)
        """
        ideal_th1, ideal_th2, reachable = self.inverse_kinematics(target_x, target_y)
        
        # Calculate Forward Kinematics of actual posture
        fk_actual = self.forward_kinematics(actual_theta1, actual_theta2)
        actual_hand = fk_actual["hand"][0:2]
        
        # Positional Reaching Error
        pos_error = np.linalg.norm(actual_hand - np.array([target_x, target_y]))
        
        # Angular Deviations
        err1 = abs(actual_theta1 - ideal_th1)
        if err1 > 180.0:
            err1 = 360.0 - err1
            
        err2 = abs(actual_theta2 - ideal_th2)
        if err2 > 180.0:
            err2 = 360.0 - err2

        # Recovery Accuracy Score (100% is perfect alignment)
        total_angle_err = err1 + err2
        accuracy_score = max(0.0, 100.0 - (total_angle_err * 0.6 + pos_error * 1.2))

        return {
            "ideal_theta1": ideal_th1,
            "ideal_theta2": ideal_th2,
            "theta1_error": err1,
            "theta2_error": err2,
            "position_error": pos_error,
            "accuracy_score": round(accuracy_score, 1),
            "actual_hand_pos": actual_hand,
            "reachable": reachable
        }

    # ==========================================================================
    # UNIT 3: JACOBIAN MATRIX & DIFFERENTIAL KINEMATICS
    # ==========================================================================

    def jacobian_matrix(self, theta1_deg, theta2_deg):
        """
        Computes the 2x2 Jacobian matrix for the 2-DOF planar arm.
        
        The Jacobian maps joint velocities to end-effector velocities:
            ẋ = J(θ) · θ̇
        
        For a 2-link planar manipulator:
            J = [[-L1·sin(θ1) - L2·sin(θ1+θ2),  -L2·sin(θ1+θ2)],
                 [ L1·cos(θ1) + L2·cos(θ1+θ2),   L2·cos(θ1+θ2)]]
        
        Parameters:
            theta1_deg: Shoulder angle in degrees
            theta2_deg: Elbow angle in degrees
            
        Returns:
            J: 2x2 numpy array (Jacobian matrix)
        """
        th1 = math.radians(theta1_deg)
        th2 = math.radians(theta2_deg)
        th12 = th1 + th2

        s1 = math.sin(th1)
        c1 = math.cos(th1)
        s12 = math.sin(th12)
        c12 = math.cos(th12)

        J = np.array([
            [-self.L1 * s1 - self.L2 * s12,  -self.L2 * s12],
            [ self.L1 * c1 + self.L2 * c12,   self.L2 * c12]
        ])
        return J

    def compute_end_effector_velocity(self, theta1_deg, theta2_deg, dtheta1, dtheta2):
        """
        Computes end-effector (hand) linear velocity using the Jacobian:
            ẋ = J(θ) · [dθ1, dθ2]^T
        
        Parameters:
            theta1_deg, theta2_deg: Current joint angles (degrees)
            dtheta1, dtheta2: Joint angular velocities (degrees/second)
            
        Returns:
            dict with vx, vy (cm/s), speed (cm/s), and the Jacobian matrix
        """
        J = self.jacobian_matrix(theta1_deg, theta2_deg)

        # Convert joint velocities to radians/s for correct units
        dtheta_rad = np.array([math.radians(dtheta1), math.radians(dtheta2)])

        # End-effector velocity: ẋ = J · θ̇
        v = J @ dtheta_rad
        vx, vy = v[0], v[1]
        speed = math.sqrt(vx**2 + vy**2)

        return {
            "vx": vx,
            "vy": vy,
            "speed": speed,
            "jacobian": J
        }

    def manipulability_index(self, theta1_deg, theta2_deg):
        """
        Computes Yoshikawa's manipulability index:
            w = |det(J)| = L1 · L2 · |sin(θ2)|
        
        This measures how easily the arm can move in all directions
        at the current configuration.
        - w = 0: singular configuration (fully extended or folded)
        - w > 0: good manipulability
        - Higher w = easier to move in all directions
        
        Parameters:
            theta1_deg, theta2_deg: Joint angles in degrees
            
        Returns:
            w: manipulability index (float)
        """
        J = self.jacobian_matrix(theta1_deg, theta2_deg)
        w = abs(np.linalg.det(J))
        return w

    def is_singular(self, theta1_deg, theta2_deg, threshold=1.0):
        """
        Detects if the arm is near a singular configuration.
        Singularity occurs when det(J) ≈ 0, meaning:
        - θ2 ≈ 0°   → arm fully extended (no elbow bend)
        - θ2 ≈ 180° → arm fully folded
        
        At singularity the arm loses a degree of freedom and
        cannot move in certain directions.
        
        Parameters:
            theta1_deg, theta2_deg: Joint angles in degrees
            threshold: sensitivity threshold for detection
            
        Returns:
            dict with is_singular (bool), determinant, and warning message
        """
        w = self.manipulability_index(theta1_deg, theta2_deg)
        singular = w < threshold

        if singular:
            th2_abs = abs(theta2_deg % 360)
            if th2_abs < 20 or th2_abs > 340:
                warning = "⚠️ SINGULARITY: Arm fully extended! Cannot move perpendicular to arm direction."
            elif 160 < th2_abs < 200:
                warning = "⚠️ SINGULARITY: Arm fully folded! Movement restricted."
            else:
                warning = "⚠️ Near-singular configuration detected."
        else:
            warning = None

        return {
            "is_singular": singular,
            "manipulability": w,
            "warning": warning
        }

    def compute_joint_torques(self, theta1_deg, theta2_deg, fx, fy):
        """
        Maps end-effector forces to joint torques using the Jacobian transpose:
            τ = J^T · F
        
        This is used to estimate how much effort each joint must exert
        to maintain or produce a force at the hand.
        
        Parameters:
            theta1_deg, theta2_deg: Joint angles in degrees
            fx, fy: End-effector force components (Newtons)
            
        Returns:
            dict with tau1, tau2 (joint torques in Nm) and the force vector
        """
        J = self.jacobian_matrix(theta1_deg, theta2_deg)
        F = np.array([fx, fy])

        # τ = J^T · F
        tau = J.T @ F

        return {
            "tau1": tau[0],
            "tau2": tau[1],
            "force": F,
            "jacobian_transpose": J.T
        }

    def compute_manipulability_ellipsoid(self, theta1_deg, theta2_deg):
        """
        Computes the manipulability ellipsoid parameters for visualization.
        The ellipsoid shows the set of achievable end-effector velocities
        for unit-norm joint velocities.
        
        Ellipsoid is characterized by J·J^T eigenvalues/eigenvectors.
        
        Parameters:
            theta1_deg, theta2_deg: Joint angles in degrees
            
        Returns:
            dict with semi-axes lengths, rotation angle, and center position
        """
        J = self.jacobian_matrix(theta1_deg, theta2_deg)
        fk = self.forward_kinematics(theta1_deg, theta2_deg)

        # M = J · J^T (velocity ellipsoid matrix)
        M = J @ J.T
        eigenvalues, eigenvectors = np.linalg.eigh(M)

        # Semi-axes are square roots of eigenvalues
        semi_axes = np.sqrt(np.maximum(eigenvalues, 0.0))

        # Rotation angle of the ellipsoid's principal axis
        angle = math.degrees(math.atan2(eigenvectors[1, 1], eigenvectors[0, 1]))

        return {
            "semi_axis_major": float(max(semi_axes)),
            "semi_axis_minor": float(min(semi_axes)),
            "rotation_angle_deg": angle,
            "center": fk["hand"][0:2].tolist(),
            "eigenvalues": eigenvalues.tolist(),
            "eigenvectors": eigenvectors.tolist()
        }

    # ==========================================================================
    # UNIT 3: MOVEMENT QUALITY ANALYSIS (Clinical Rehabilitation Metrics)
    # ==========================================================================

    def compute_movement_smoothness(self, joint_angles_timeseries, dt=1.0 / 30.0):
        """
        Computes normalized jerk metric from a time series of joint angles.
        
        Jerk is the third derivative of position (rate of change of acceleration).
        Lower jerk = smoother movement = better motor recovery.
        Healthy movements have smooth, bell-shaped velocity profiles.
        
        Normalized Jerk Score:
            NJ = -√( (T^5 / (2·D^2)) · ∫ |j(t)|^2 dt )
        where T = duration, D = path length
        
        We convert to a 0-100 score where 100 = perfectly smooth.
        
        Parameters:
            joint_angles_timeseries: list of (theta1, theta2) tuples
            dt: time step between samples (default 1/30 for 30fps)
            
        Returns:
            dict with smoothness_score (0-100), jerk_metric, interpretation
        """
        if len(joint_angles_timeseries) < 4:
            return {"smoothness_score": 50.0, "jerk_metric": 0.0, "interpretation": "Insufficient data"}

        # Convert joint angles to end-effector positions
        positions = []
        for th1, th2 in joint_angles_timeseries:
            fk = self.forward_kinematics(th1, th2)
            positions.append(fk["hand"][0:2].copy())

        positions = np.array(positions)

        # Compute velocity (1st derivative)
        velocity = np.diff(positions, axis=0) / dt

        # Compute acceleration (2nd derivative)
        acceleration = np.diff(velocity, axis=0) / dt

        # Compute jerk (3rd derivative)
        jerk = np.diff(acceleration, axis=0) / dt

        if len(jerk) == 0:
            return {"smoothness_score": 50.0, "jerk_metric": 0.0, "interpretation": "Insufficient data"}

        # Squared jerk magnitude at each timestep
        jerk_sq = np.sum(jerk**2, axis=1)

        # Integrated squared jerk
        integrated_jerk = np.sum(jerk_sq) * dt

        # Path length for normalization
        displacements = np.diff(positions, axis=0)
        path_length = np.sum(np.sqrt(np.sum(displacements**2, axis=1)))

        # Duration
        T = len(joint_angles_timeseries) * dt

        # Normalized jerk (dimensionless)
        if path_length > 1e-6:
            normalized_jerk = math.sqrt((T**5 / (2.0 * path_length**2 + 1e-9)) * integrated_jerk)
        else:
            normalized_jerk = 0.0

        # Convert to 0-100 score (empirical mapping)
        # Lower NJ = smoother. Typical healthy: NJ < 50, impaired: NJ > 200
        smoothness_score = max(0.0, min(100.0, 100.0 - (normalized_jerk * 0.3)))

        # Interpretation
        if smoothness_score >= 80:
            interpretation = "Excellent — smooth, coordinated movement"
        elif smoothness_score >= 60:
            interpretation = "Good — minor irregularities detected"
        elif smoothness_score >= 40:
            interpretation = "Fair — noticeable jerkiness, keep practicing"
        elif smoothness_score >= 20:
            interpretation = "Poor — significant movement discontinuities"
        else:
            interpretation = "Very poor — highly fragmented movement"

        return {
            "smoothness_score": round(smoothness_score, 1),
            "jerk_metric": round(normalized_jerk, 2),
            "interpretation": interpretation
        }

    def compute_velocity_profile(self, positions_timeseries, dt=1.0 / 30.0):
        """
        Computes the velocity profile from a time series of (x, y) positions.
        
        A healthy reaching movement follows a bell-shaped velocity profile:
        - Smooth acceleration phase
        - Single peak velocity
        - Smooth deceleration phase
        
        Multiple peaks indicate corrective sub-movements (sign of impairment).
        
        Parameters:
            positions_timeseries: list of (x, y) tuples
            dt: time step between samples
            
        Returns:
            dict with velocities, peak_velocity, is_bell_shaped, num_peaks
        """
        if len(positions_timeseries) < 3:
            return {
                "velocities": [],
                "peak_velocity": 0.0,
                "is_bell_shaped": False,
                "num_peaks": 0,
                "interpretation": "Insufficient data"
            }

        positions = np.array(positions_timeseries)
        displacements = np.diff(positions, axis=0)
        velocities = np.sqrt(np.sum(displacements**2, axis=1)) / dt

        peak_velocity = float(np.max(velocities)) if len(velocities) > 0 else 0.0

        # Count velocity peaks (local maxima above 20% of peak)
        threshold = peak_velocity * 0.2
        peaks = []
        for i in range(1, len(velocities) - 1):
            if (velocities[i] > velocities[i - 1] and
                velocities[i] > velocities[i + 1] and
                velocities[i] > threshold):
                peaks.append(i)

        num_peaks = len(peaks)
        # Bell-shaped = exactly 1 dominant peak
        is_bell_shaped = num_peaks == 1

        if is_bell_shaped:
            interpretation = "✓ Bell-shaped profile — healthy movement pattern"
        elif num_peaks == 0:
            interpretation = "No clear velocity peak detected"
        elif num_peaks <= 3:
            interpretation = f"Multiple peaks ({num_peaks}) — minor corrective sub-movements"
        else:
            interpretation = f"Fragmented profile ({num_peaks} peaks) — significant motor impairment"

        return {
            "velocities": velocities.tolist(),
            "peak_velocity": round(peak_velocity, 2),
            "is_bell_shaped": is_bell_shaped,
            "num_peaks": num_peaks,
            "interpretation": interpretation
        }
