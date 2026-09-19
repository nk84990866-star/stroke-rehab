"""
Kinematics Engine for AI Gesture-Based Stroke Rehabilitation System
Syllabus Alignment:
  - Unit 1: Vectors, Matrices, Rigid Body Transformations, Homogeneous Transformation Matrix (4x4)
  - Unit 2: Forward Kinematics (FK), Inverse Kinematics (IK), D-H Parameters
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
