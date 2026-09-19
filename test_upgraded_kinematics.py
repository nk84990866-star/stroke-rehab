# -*- coding: utf-8 -*-
"""
Comprehensive tests verifying upgraded kinematics features (Unit 3).
Tests: Jacobian calculations, Manipulability index, Singularities, and jerks movement smoothness index.
"""
import numpy as np
from backend.services.kinematics_engine import UpperLimbKinematics

def test_unit_3_jacobian_and_smoothness():
    print("=" * 80)
    print("UNIT 3 TEST: JACOBIAN, VELOCITY MAPPING & MOVEMENT SMOOTHNESS (JERK)")
    print("=" * 80)

    arm = UpperLimbKinematics(L1=30.0, L2=25.0)

    # 1. Jacobian computation at a standard pose
    theta1, theta2 = 45.0, 45.0
    J = arm.jacobian_matrix(theta1, theta2)
    print("[1] Jacobian Matrix J computed at theta1=45, theta2=45:")
    print(np.round(J, 3))
    print()

    # 2. Velocity Mapping
    dtheta1, dtheta2 = 10.0, -10.0  # degrees/sec
    v_res = arm.compute_end_effector_velocity(theta1, theta2, dtheta1, dtheta2)
    print("[2] End-Effector Velocity (x_dot = J * theta_dot):")
    print(f"    Joint Velocities: dtheta1={dtheta1} deg/s, dtheta2={dtheta2} deg/s")
    print(f"    Calculated linear speed: {v_res['speed']:.3f} cm/s")
    print(f"    vx: {v_res['vx']:.3f} cm/s, vy: {v_res['vy']:.3f} cm/s")
    print()

    # 3. Manipulability & Singularity Detection
    print("[3] Workspace Boundary & Singularity Audits:")
    for th2 in [0.0, 45.0, 90.0, 180.0]:
        sing_res = arm.is_singular(theta1, th2)
        print(f"    Elbow angle theta2 = {th2:5.1f} deg | Manipulability: {sing_res['manipulability']:8.2f} | Singular? {sing_res['is_singular']}")
        if sing_res['warning']:
            clean_warning = sing_res['warning'].replace("⚠️", "[WARNING]")
            print(f"      -> {clean_warning}")
    print()

    # 4. Movement Smoothness Jerk Metric
    # Simulated reaching sequence: smooth trajectory vs shaky/impaired trajectory
    smooth_traj = []
    shaky_traj = []
    for i in range(20):
        t = i / 20.0
        # Smooth interpolation from theta=(30, 45) to (60, 90)
        smooth_traj.append((30.0 + 30.0 * t, 45.0 + 45.0 * t))
        # Add random noise/tremors to simulate impaired stroke motor control
        noise1 = np.random.normal(0, 3.0)
        noise2 = np.random.normal(0, 3.0)
        shaky_traj.append((30.0 + 30.0 * t + noise1, 45.0 + 45.0 * t + noise2))

    smooth_score = arm.compute_movement_smoothness(smooth_traj)
    shaky_score = arm.compute_movement_smoothness(shaky_traj)

    print("[4] Movement Quality Analysis (Jerk Metric):")
    print(f"    Healthy/Smooth Trajectory Score: {smooth_score['smoothness_score']}% ({smooth_score['interpretation']})")
    print(f"    Impaired/Shaky Trajectory Score: {shaky_score['smoothness_score']}% ({shaky_score['interpretation']})")
    print("=" * 80)

if __name__ == "__main__":
    test_unit_3_jacobian_and_smoothness()
