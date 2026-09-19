# Project Plan: AI in HealthCare - Gesture-Based Rehabilitation System for Stroke Patients

## Overview & Scope for Mid-Review
- **Target Units**: Unit 1 & Unit 2 only.
- **Explicit Constraint**: Exclude Differential Kinematics / Jacobian Matrix for this phase.
- **Core Focus**:
  1. **Unit 1**: Basic Mathematics (Vectors, Matrices), Rigid Body Transformations (Translation & Rotation in 3D), Homogeneous Transformation Matrices ($4 \times 4$).
  2. **Unit 2**: Denavit-Hartenberg (D-H) Parameter Formulation, Forward Kinematics (FK), Analytical/Geometric Inverse Kinematics (IK), Joint Range-of-Motion (ROM) assessment.

---

## 1. Syllabus to Project Concept Mapping (Excluding Jacobian)

| Unit | Syllabus Topic | Specific Application in Stroke Rehabilitation Project |
| :--- | :--- | :--- |
| **Unit 1** | **Vectors, Matrices & Linear Algebra** | - Joint landmark coordinates (Shoulder, Elbow, Wrist, Hand) represented as 3D spatial vectors $\vec{p} = [x, y, z]^T$.<br>- Vector dot product ($\vec{u} \cdot \vec{v}$) and cross product ($\vec{u} \times \vec{v}$) to calculate raw anatomical flexion/extension angles. |
| **Unit 1** | **Rigid Body Transformations (Translation & Rotation)** | - Mapping between Camera Coordinate Frame $\{C\}$, Patient Trunk/Body Frame $\{B\}$, and Rehabilitation Reference Frame $\{0\}$.<br>- Constructing $3 \times 3$ Rotation Matrices $R_x(\theta), R_y(\theta), R_z(\theta)$ for joint rotations. |
| **Unit 1** | **Homogeneous Transformation Matrix ($4 \times 4$ HTM)** | - Unifying 3D rotation and translation into single $4 \times 4$ matrices:<br>$$T_i^{i-1} = \begin{bmatrix} R & \vec{d} \\ \mathbf{0} & 1 \end{bmatrix}$$<br>- Chaining transformations across consecutive limbs: $T_0^3 = T_0^1 \cdot T_1^2 \cdot T_2^3$. |
| **Unit 2** | **Forward Kinematics (FK) & D-H Parameters** | - Modeling upper limb / assistive arm as a kinematic chain (Shoulder $\to$ Upper Arm $L_1 \to$ Forearm $L_2 \to$ Hand).<br>- Setting up the standard Denavit-Hartenberg (D-H) parameter table ($a_i, \alpha_i, d_i, \theta_i$).<br>- Computing end-effector (hand/wrist) Cartesian position $(X, Y, Z)$ from measured joint angles. |
| **Unit 2** | **Inverse Kinematics (IK)** | - **Prescribed Stroke Therapy**: When a patient is assigned a target reaching coordinate $(X_t, Y_t, Z_t)$ (e.g., reaching for a cup or virtual target), analytical/geometric IK calculates the **target joint angles** $(\theta_1^*, \theta_2^*)$.<br>- Comparing patient's actual joint angles with the ideal IK solution to compute **Motor Deviation Error** and **Range of Motion (ROM)** recovery percentage. |

---

## 2. Level-by-Level Step-by-Step Implementation Roadmap

```
Level 0: Coordinate Frames & HTM Derivations (Unit 1)
   │
   ▼
Level 1: AI Vision Keypoint Extraction (OpenCV / MediaPipe)
   │
   ▼
Level 2: D-H Parameter Table & Forward Kinematics (Unit 2)
   │
   ▼
Level 3: Inverse Kinematics & Rehabilitation Target Planning (Unit 2)
   │
   ▼
Level 4: Motor Recovery & Assessment Metrics (Angle Error & ROM)
   │
   ▼
Level 5: Real-Time Interactive Mid-Review Visualizer & Demo Dashboard
```

### **Level 0: Mathematical & Frame Setup (Unit 1)**
- Define standard coordinate frames:
  - Base Frame $\{0\}$ at Patient Shoulder.
  - Link 1 Frame $\{1\}$ at Upper Arm / Elbow joint.
  - Link 2 Frame $\{2\}$ at Forearm / Wrist joint.
  - End-Effector Frame $\{3\}$ at Palm/Hand center.
- Formulate the general $4 \times 4$ transformation matrices.

### **Level 1: AI Vision Keypoint Extraction & Preprocessing**
- Capture live webcam frames.
- Use MediaPipe Pose / Hands to detect 3D landmark vectors:
  - $\vec{P}_{shoulder} = (x_s, y_s, z_s)$
  - $\vec{P}_{elbow} = (x_e, y_e, z_e)$
  - $\vec{P}_{wrist} = (x_w, y_w, z_w)$
- Apply translation normalization so Shoulder is the origin $(0, 0, 0)$.

### **Level 2: D-H Parameters & Forward Kinematics (Unit 2)**
- Calculate link lengths ($L_1 = \|\vec{P}_{elbow} - \vec{P}_{shoulder}\|$, $L_2 = \|\vec{P}_{wrist} - \vec{P}_{elbow}\|$).
- Formulate the D-H parameter table:
  - Joint 1 (Shoulder elevation/flexion): $\theta_1, d_1, a_1, \alpha_1$
  - Joint 2 (Elbow flexion/extension): $\theta_2, d_2, a_2, \alpha_2$
- Compute the Forward Kinematic matrix $T_0^2 = A_1 A_2$ to calculate computed hand position $(X_{FK}, Y_{FK}, Z_{FK})$.

### **Level 3: Inverse Kinematics for Reaching Exercises (Unit 2)**
- Define exercise targets in Cartesian space $(X_{target}, Y_{target})$.
- Solve analytical Inverse Kinematics using the law of cosines:
  $$\cos(\theta_2) = \frac{X^2 + Y^2 - L_1^2 - L_2^2}{2 L_1 L_2}$$
  $$\theta_1 = \text{atan2}(Y, X) - \text{atan2}(L_2 \sin\theta_2, L_1 + L_2 \cos\theta_2)$$
- Provide both "Elbow-Up" and "Elbow-Down" solutions suitable for patient comfort.

### **Level 4: Rehabilitation Assessment & Progress Scoring**
- Calculate real-time patient recovery metrics:
  - **Joint Angle Deviation**: $\Delta \theta_i = |\theta_{\text{actual}} - \theta_{\text{ideal\_IK}}|$
  - **Rehabilitation Accuracy Score**:
    $$\text{Score (\%)} = \max\left(0, 100 - k \cdot (\Delta \theta_1 + \Delta \theta_2)\right)$$
  - **Range of Motion (ROM) Benchmark**: Tracking maximum angle reached per therapy session.

### **Level 5: Mid-Review Dashboard & Demonstration**
- Visual GUI with:
  1. Live camera feed showing patient's skeleton.
  2. Side-by-side 2D/3D Kinematic Digital Twin showing D-H coordinate frames.
  3. Real-time telemetry panel displaying $\theta_1, \theta_2$, FK coordinates $(X, Y)$, Target coordinates, and Recovery Score.
