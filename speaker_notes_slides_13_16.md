# Speaker Notes — Slides 13–16 (Nanda) · Maths Mid-Review

Framing: this is a **Maths** review. Talk about the mathematics (rigid-body
transformations, 4×4 HTM, D-H parameters, FK, IK) and the *verification numbers*.
No robotics, no games, no FPS talk.

All numbers below were captured by actually running `test_kinematics.py`
(Unit 1 & Unit 2 test suite) — they are real outputs, safe to quote.

---

## Slide 13 — Preliminary Results & System Telemetry

**→ Rename in your head (or on the slide): "Numerical Verification of the Kinematic Formulations"**

### Part A — Unit 1 verification (Vectors & 4×4 HTM)

**Say:**
> "Unit 1 — vector goniometry. Using the dot product rule
> cos θ = (u·v) / (‖u‖·‖v‖), with the upper-arm vector (0, 30, 0) and the
> forearm vector (25, 30, 0), we compute the elbow joint angle as **39.81°**."

**Then show the 4×4 Homogeneous Transformation Matrix** (45° rotation about Z,
translation (10, 20, 0)):

```
T = [ 0.707  -0.707   0    10 ]
    [ 0.707   0.707   0    20 ]
    [ 0       0       1     0 ]
    [ 0       0       0     1 ]
```

**Say:**
> "One matrix represents rotation and translation together — the block form
> T = [[R, d], [0, 1]] — which is how we chain every joint in the arm."

### Part B — Unit 2 verification (D-H, FK, IK)

**D-H parameter table (say this):**
> "We model the upper limb as a 2-link kinematic chain: shoulder → elbow → hand.
> The D-H table is: Joint 1 (shoulder): θ = 30°, d = 0, a = 30 cm, α = 0°.
> Joint 2 (elbow): θ = 45°, d = 0, a = 25 cm, α = 0°."

**Forward Kinematics (say this):**
> "Chaining the two D-H matrices, T₀₂ = A₁ · A₂, the shoulder is the origin,
> the elbow lands at **(25.98, 15.00, 0.00)**, and the hand lands at
> **(32.45, 39.15, 0.00)**."

**Inverse Kinematics round-trip — YOUR STRONGEST POINT (say this):**
> "Now the key check: we take that computed hand position (32.45, 39.15) and
> feed it back through the analytical law-of-cosines IK. The IK returns
> θ₁ = **30.00°** and θ₂ = **45.00°** — exactly the angles we started with.
> The workspace check says the target is reachable. **FK and IK are
> mathematically consistent — the round-trip closes perfectly.**"

### Part C — Rehab assessment score (clinical payoff of the math)

**Say:**
> "Finally, the math gives a clinical number. A patient performing the same
> exercise with slight motor deviation — shoulder 35° instead of 30°, elbow
> 38° instead of 45° — produces a shoulder error of 5.00°, an elbow error of
> 7.00°, and a hand position error of 2.05 cm. The recovery accuracy score is
> **90.3 / 100**. So every angle, every error, and every score comes from a
> closed-form formula — fully explainable."

Score formula (know by heart, in case of questions):
```
Score = max(0, 100 − (0.6 · (Δθ₁ + Δθ₂) + 1.2 · position_error))
      = max(0, 100 − (0.6·12 + 1.2·2.05)) = 90.3
```

### Live demo (if time permits)
- Run `test_kinematics.py` — it prints every number above in 2 seconds.
  Point at the screen line by line.
- Optionally run `rehab_dashboard.py` — webcam + live skeleton + target
  exercises. Press `t` to cycle the 4 exercise targets. (Skip if camera is unreliable.)

---

## Slide 14 — Conclusion (math framing)

Speak only 3–4 of these, tied to what you just showed:

1. **"Unified representation."** One 4×4 homogeneous matrix formalism covers
   translation + rotation for every joint in the upper limb.
2. **"Explainability."** Every telemetry value is produced by a closed-form
   formula (dot products, law of cosines, matrix chaining) — no black box.
3. **"Mathematical consistency."** FK and IK agree exactly — verified by the
   round-trip test (30° / 45° → position → 30° / 45°).
4. **"Clinical usefulness."** The same math yields objective metrics — joint
   angles θ, positional error in cm, and a 0–100 recovery score.

Avoid: games, FPS, Gemini, "webcam-only" marketing. Keep it on the math.

---

## Slide 15 — Future Work (math framing)

Lead with the math extensions, in syllabus order:

1. **Full 3D kinematics:** extend the planar 2-link chain to three dimensions
   and add the wrist as a third joint (a third D-H row).
2. **Differential kinematics / Jacobian:** planned for the final review —
   "the natural next step in the syllabus progression" (explicitly excluded
   from this mid-review scope).
3. **Longitudinal tracking:** multi-week plots of the same θ and score metrics.

Mention games/portal only if asked — they are secondary in a maths review.

---

## Slide 16 — Thank You

**Say:**
> "Thank you. We're happy to walk through the D-H derivation and the FK/IK
> verification in more detail — and we'd welcome questions on the formulations."

This invites questions on your strongest material (the math), not on features.

---

## Cheat sheet — key numbers (memorize these)

| Item | Value |
|---|---|
| Vector angle (upper arm vs forearm) | 39.81° |
| HTM example | 45° Rz + translation (10, 20, 0) |
| D-H Joint 1 (shoulder) | θ=30°, d=0, a=30 cm, α=0° |
| D-H Joint 2 (elbow) | θ=45°, d=0, a=25 cm, α=0° |
| FK elbow position | (25.98, 15.00, 0.00) |
| FK hand position | (32.45, 39.15, 0.00) |
| IK round-trip result | θ₁ = 30.00°, θ₂ = 45.00° (exact match) |
| Reachable workspace | True |
| Patient deviation example | θ₁=35° (err 5.00°), θ₂=38° (err 7.00°), pos err 2.05 cm |
| Recovery accuracy score | 90.3 / 100 |
