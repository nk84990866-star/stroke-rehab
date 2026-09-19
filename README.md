# AI in HealthCare: A Gesture-Based Rehabilitation System for Stroke Patients
## Mid-Review Project Architecture & Syllabus Alignment (Units 1 & 2)

---

## 📚 1. Course Syllabus Mapping

### **Unit 1: Overview & Rigid Body Transformations**
1. **Vectors & Matrices**:
   - 3D landmark coordinates for human arm keypoints:
     $$\vec{P}_{\text{shoulder}} = \begin{bmatrix} x_s \\ y_s \\ z_s \end{bmatrix}, \quad \vec{P}_{\text{elbow}} = \begin{bmatrix} x_e \\ y_e \\ z_e \end{bmatrix}, \quad \vec{P}_{\text{wrist}} = \begin{bmatrix} x_w \\ y_w \\ z_w \end{bmatrix}$$
   - Anatomical joint angle calculation via vector dot product:
     $$\cos(\theta) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$$
2. **Rotations & Rigid Body Transformations**:
   - $3 \times 3$ Rotation matrices $R_x, R_y, R_z$.
   - Mapping sensor camera frame $\{C\}$ to patient base coordinate frame $\{0\}$.
3. **Homogeneous Transformation Matrices ($4 \times 4$ HTM)**:
   - Compact representation of translation $\vec{d}$ and rotation $R$:
     $$T = \begin{bmatrix} R & \vec{d} \\ \mathbf{0} & 1 \end{bmatrix}$$

### **Unit 2: Kinematics of Simple Robotic Systems**
1. **Denavit-Hartenberg (D-H) Parameter Formulation**:
   - Table of parameters ($a_i$: link length, $\alpha_i$: link twist, $d_i$: offset, $\theta_i$: joint angle) for upper arm ($L_1$) and forearm ($L_2$).
2. **Forward Kinematics (FK)**:
   - Chaining transformation matrices:
     $$T_0^2 = A_1(\theta_1) \cdot A_2(\theta_2)$$
   - Determines the 3D position of the patient's hand/wrist $(X, Y, Z)$ in space.
3. **Inverse Kinematics (IK) for Stroke Therapy**:
   - Prescribed therapy targets $(X_t, Y_t)$ in patient workspace.
   - Closed-form analytical solution via Law of Cosines to find target joint angles:
     $$\cos(\theta_2) = \frac{X_t^2 + Y_t^2 - L_1^2 - L_2^2}{2 L_1 L_2}$$
     $$\theta_1 = \text{atan2}(Y_t, X_t) - \text{atan2}(L_2 \sin\theta_2, L_1 + L_2 \cos\theta_2)$$
4. **Rehabilitation Scoring**:
   - Measures patient motor recovery and angular deviation error from prescribed target posture.

---

## 🚀 2. How to Run

### **Step 1: Run the Mathematical & Verification Test Suite**
```bash
.\.venv\Scripts\python.exe test_kinematics.py
```
*Outputs the D-H table, homogeneous matrices, FK/IK verification, and recovery scoring.*

### **Step 2: Run the Real-Time Interactive Demonstration Dashboard**
```bash
.\.venv\Scripts\python.exe rehab_dashboard.py
```
*Interactive Controls:*
- Press `'t'` to cycle through standard stroke rehabilitation targets.
- Press `'s'` to switch between live webcam and synthetic rehabilitation replay.
- Press `'q'` to exit.
