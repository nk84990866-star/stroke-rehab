"""
Verification & Test Suite for Unit 1 & Unit 2 Kinematics
AI in HealthCare: Gesture-Based Stroke Rehabilitation System

Demonstrates:
  1. Unit 1: 3D Vectors, Dot/Cross Products, Rotation Matrices, 4x4 Homogeneous Transformation Matrices
  2. Unit 2: D-H Parameter Table derivation, Forward Kinematics (FK), Inverse Kinematics (IK)
  3. Rehabilitation Metrics: Joint Angular Deviation, Target Reaching Accuracy, ROM Score
"""

import math
import numpy as np
from kinematics_engine import (
    rot_x, rot_y, rot_z,
    homogeneous_transform_matrix,
    dh_transformation_matrix,
    compute_angle_between_vectors,
    UpperLimbKinematics
)

def test_unit_1_transformations():
    print("=" * 70)
    print("UNIT 1 TEST: VECTORS & HOMOGENEOUS TRANSFORMATION MATRICES (4x4)")
    print("=" * 70)

    # 1. Vector Angles
    v_upper_arm = np.array([0.0, 30.0, 0.0])
    v_forearm = np.array([25.0, 30.0, 0.0])
    angle = compute_angle_between_vectors(v_upper_arm, v_forearm)
    print("[1] Vector Angle Calculation:")
    print("    Upper Arm Vector: {}".format(v_upper_arm))
    print("    Forearm Vector:   {}".format(v_forearm))
    print("    Calculated Joint Angle: {:.2f} degrees\n".format(angle))

    # 2. Rotation & Homogeneous Transformation
    theta_z = math.radians(45.0)
    Rz = rot_z(theta_z)
    translation = np.array([10.0, 20.0, 0.0])
    T = homogeneous_transform_matrix(Rz, translation)

    print("[2] 4x4 Homogeneous Transformation Matrix T (45 deg Z-rot, Translation [10, 20, 0]):")
    print(np.round(T, 3))
    print("\n" + "-" * 70)

def test_unit_2_forward_and_inverse_kinematics():
    print("=" * 70)
    print("UNIT 2 TEST: FORWARD & INVERSE KINEMATICS FOR STROKE REHABILITATION")
    print("=" * 70)

    # Upper limb lengths: L1 = 30 cm (Upper Arm), L2 = 25 cm (Forearm)
    arm = UpperLimbKinematics(L1=30.0, L2=25.0)
    
    # Test Angles: Shoulder = 30 deg, Elbow = 45 deg
    th1_test = 30.0
    th2_test = 45.0

    print("[1] Denavit-Hartenberg (D-H) Parameter Table:")
    dh_table = arm.get_dh_table(th1_test, th2_test)
    print("    Joint |  theta (deg)  |  d (cm)  |  a (cm)  |  alpha (deg)")
    print("    " + "-" * 55)
    for row in dh_table:
        print("      {:d}   |     {:6.1f}    |   {:4.1f}   |   {:4.1f}   |     {:4.1f}".format(
            row["joint"], row["theta_deg"], row["d"], row["a"], row["alpha_deg"]
        ))
    print()

    # Forward Kinematics
    fk_res = arm.forward_kinematics(th1_test, th2_test)
    hand_pos = fk_res["hand"]
    elbow_pos = fk_res["elbow"]

    print("[2] Forward Kinematics (FK) Output:")
    print("    Shoulder Base Frame: (0.0, 0.0, 0.0)")
    print("    Elbow Position:      ({:.2f}, {:.2f}, {:.2f})".format(elbow_pos[0], elbow_pos[1], elbow_pos[2]))
    print("    Hand/Wrist Position: ({:.2f}, {:.2f}, {:.2f})\n".format(hand_pos[0], hand_pos[1], hand_pos[2]))

    # Inverse Kinematics Verification
    target_x, target_y = hand_pos[0], hand_pos[1]
    ik_th1, ik_th2, reachable = arm.inverse_kinematics(target_x, target_y)

    print("[3] Inverse Kinematics (IK) Target Reaching Verification:")
    print("    Target Coordinates: ({:.2f}, {:.2f})".format(target_x, target_y))
    print("    Calculated Ideal Angles: theta1 = {:.2f} deg, theta2 = {:.2f} deg".format(ik_th1, ik_th2))
    print("    Reachable Workspace Status: {}\n".format(reachable))

    # Stroke Rehabilitation Exercise Evaluation
    # Simulated Patient movement with motor deviation: actual angles are slightly off target
    patient_actual_th1 = 35.0  # +5 degrees deviation
    patient_actual_th2 = 38.0  # -7 degrees deviation

    metrics = arm.evaluate_rehabilitation_metrics(
        actual_theta1=patient_actual_th1,
        actual_theta2=patient_actual_th2,
        target_x=target_x,
        target_y=target_y
    )

    print("[4] Stroke Rehabilitation Exercise Assessment Report:")
    print("    Target Prescription: Hand at ({:.1f}, {:.1f})".format(target_x, target_y))
    print("    Ideal Posture Required:  theta1 = {:.1f} deg, theta2 = {:.1f} deg".format(metrics["ideal_theta1"], metrics["ideal_theta2"]))
    print("    Patient Actual Posture:  theta1 = {:.1f} deg, theta2 = {:.1f} deg".format(patient_actual_th1, patient_actual_th2))
    print("    Joint 1 Error (Shoulder): {:.2f} deg".format(metrics["theta1_error"]))
    print("    Joint 2 Error (Elbow)   : {:.2f} deg".format(metrics["theta2_error"]))
    print("    Hand Positional Error   : {:.2f} cm".format(metrics["position_error"]))
    print("    Rehabilitation Motor Recovery Score: {:.1f} / 100.0%".format(metrics["accuracy_score"]))
    print("=" * 70)

if __name__ == "__main__":
    test_unit_1_transformations()
    test_unit_2_forward_and_inverse_kinematics()
