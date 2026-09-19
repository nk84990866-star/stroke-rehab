"""
Exercise Programs for NeuroMotion AI — Disease-Specific, Level-Based Rehabilitation

LEVEL 1 — BASIC (Beginner / Severe patients)
  Slow movements, large targets, generous scoring, long hold times.
  
LEVEL 2 — MODERATE (Intermediate patients)
  Normal speed, medium targets, standard scoring.
  
LEVEL 3 — HIGH / ADVANCED (Fast, like a normal person or faster)
  Fast movements, small targets, strict scoring, timed challenges.

Stroke Types: Ischemic, Hemorrhagic, TIA, Brainstem
Each exercise is mapped to suitable stroke types and severity ranges.
"""

import json

# ==============================================================================
# EXERCISE DEFINITIONS — Organized by Level
# ==============================================================================

EXERCISE_LIBRARY = [
    # =========================================================================
    # LEVEL 1 — BASIC (Beginner / Severe)
    # Slow, gentle movements. Large targets (radius 8+ cm). Generous scoring.
    # =========================================================================
    {
        "name": "Gentle Forward Reach",
        "description": "Slowly extend your arm forward to touch a large target directly in front of you. Focus on controlled, steady movement — no rush.",
        "category": "rom",
        "level": 1,
        "level_name": "Basic",
        "target_positions": [
            {"x": 40, "y": 15, "hold_sec": 3},
        ],
        "duration_seconds": 45,
        "instructions": "1. Sit comfortably with your back straight.\n2. Let your affected arm rest at your side.\n3. Slowly raise and extend your arm toward the green target.\n4. Hold for 3 seconds when you reach it.\n5. Slowly return to starting position.",
        "suitable_stroke_types": ["ischemic", "hemorrhagic", "tia", "brainstem"],
        "min_severity": 1,
        "max_severity": 3,
        "icon_name": "hand",
        "target_radius": 10.0,
        "speed_requirement": "slow",
    },
    {
        "name": "Guided Lateral Reach",
        "description": "Move your arm gently to the side to touch a target at shoulder height. This improves abduction range of motion.",
        "category": "rom",
        "level": 1,
        "level_name": "Basic",
        "target_positions": [
            {"x": 25, "y": 35, "hold_sec": 3},
        ],
        "duration_seconds": 45,
        "instructions": "1. Start with arm resting at your side.\n2. Slowly lift your arm out to the side.\n3. Reach toward the target at shoulder height.\n4. Hold for 3 seconds.\n5. Gently lower your arm back down.",
        "suitable_stroke_types": ["ischemic", "hemorrhagic", "tia", "brainstem"],
        "min_severity": 1,
        "max_severity": 3,
        "icon_name": "move",
        "target_radius": 10.0,
        "speed_requirement": "slow",
    },
    {
        "name": "Hold & Stabilize (Easy)",
        "description": "Hold your arm steady at a comfortable position for 5 seconds. Builds basic arm control and endurance.",
        "category": "rom",
        "level": 1,
        "level_name": "Basic",
        "target_positions": [
            {"x": 35, "y": 20, "hold_sec": 5},
        ],
        "duration_seconds": 30,
        "instructions": "1. Raise your arm to the target position.\n2. Hold your arm as still as possible.\n3. The target will fill up as you hold steady.\n4. Try to minimize shaking.\n5. Rest when complete.",
        "suitable_stroke_types": ["ischemic", "hemorrhagic", "tia", "brainstem"],
        "min_severity": 1,
        "max_severity": 4,
        "icon_name": "lock",
        "target_radius": 10.0,
        "speed_requirement": "slow",
    },
    {
        "name": "Passive Arc Sweep",
        "description": "Slowly sweep your arm through a gentle 90° arc. Focuses on smooth, controlled angular movement.",
        "category": "rom",
        "level": 1,
        "level_name": "Basic",
        "target_positions": [
            {"x": 45, "y": 10, "hold_sec": 1},
            {"x": 40, "y": 25, "hold_sec": 1},
            {"x": 30, "y": 35, "hold_sec": 1},
        ],
        "duration_seconds": 60,
        "instructions": "1. Start with arm extended forward.\n2. Slowly sweep your arm upward in an arc.\n3. Touch each target along the path.\n4. Move smoothly — avoid jerky motions.\n5. Complete the full arc sweep.",
        "suitable_stroke_types": ["ischemic", "hemorrhagic", "tia", "brainstem"],
        "min_severity": 1,
        "max_severity": 3,
        "icon_name": "rotate-ccw",
        "target_radius": 9.0,
        "speed_requirement": "slow",
    },

    # =========================================================================
    # LEVEL 2 — MODERATE (Intermediate)
    # Normal speed, medium targets (radius 5 cm), standard scoring.
    # =========================================================================
    {
        "name": "Overhead Reach",
        "description": "Lift your arm above shoulder height to touch an overhead target. Tests shoulder flexion and ROM.",
        "category": "rom",
        "level": 2,
        "level_name": "Moderate",
        "target_positions": [
            {"x": 15, "y": 45, "hold_sec": 2},
        ],
        "duration_seconds": 45,
        "instructions": "1. Start with arm at your side.\n2. Raise your arm overhead toward the target.\n3. Reach as high as you comfortably can.\n4. Hold at the target for 2 seconds.\n5. Slowly lower your arm.",
        "suitable_stroke_types": ["ischemic", "hemorrhagic", "tia", "brainstem"],
        "min_severity": 2,
        "max_severity": 5,
        "icon_name": "arrow-up",
        "target_radius": 6.0,
        "speed_requirement": "normal",
    },
    {
        "name": "Circle Trace",
        "description": "Trace a circular path with your hand. Requires coordination and controlled multi-directional movement.",
        "category": "coordination",
        "level": 2,
        "level_name": "Moderate",
        "target_positions": [
            {"x": 40, "y": 25, "hold_sec": 0.5},
            {"x": 35, "y": 35, "hold_sec": 0.5},
            {"x": 25, "y": 35, "hold_sec": 0.5},
            {"x": 20, "y": 25, "hold_sec": 0.5},
            {"x": 25, "y": 15, "hold_sec": 0.5},
            {"x": 35, "y": 15, "hold_sec": 0.5},
        ],
        "duration_seconds": 60,
        "instructions": "1. Follow the targets appearing in a circular pattern.\n2. Move smoothly from one target to the next.\n3. Try to maintain a consistent speed.\n4. Keep the motion fluid — avoid stops.\n5. Complete at least 2 full circles.",
        "suitable_stroke_types": ["ischemic", "tia", "brainstem"],
        "min_severity": 2,
        "max_severity": 5,
        "icon_name": "circle",
        "target_radius": 6.0,
        "speed_requirement": "normal",
    },
    {
        "name": "Sequential Targets",
        "description": "Hit 4 targets appearing one after another. Builds reaction time and directional control at normal speed.",
        "category": "coordination",
        "level": 2,
        "level_name": "Moderate",
        "target_positions": [
            {"x": 40, "y": 10, "hold_sec": 1},
            {"x": 15, "y": 40, "hold_sec": 1},
            {"x": 45, "y": 35, "hold_sec": 1},
            {"x": 20, "y": 15, "hold_sec": 1},
        ],
        "duration_seconds": 60,
        "instructions": "1. A target will appear on screen.\n2. Move your hand to reach the target.\n3. Hold briefly to register a hit.\n4. The next target will appear in a new location.\n5. Complete all 4 targets.",
        "suitable_stroke_types": ["ischemic", "hemorrhagic", "tia", "brainstem"],
        "min_severity": 2,
        "max_severity": 5,
        "icon_name": "target",
        "target_radius": 5.5,
        "speed_requirement": "normal",
    },
    {
        "name": "Figure-8 Trace",
        "description": "Trace a figure-8 pattern with your hand. Advanced coordination exercise requiring directional changes.",
        "category": "coordination",
        "level": 2,
        "level_name": "Moderate",
        "target_positions": [
            {"x": 35, "y": 30, "hold_sec": 0.3},
            {"x": 40, "y": 35, "hold_sec": 0.3},
            {"x": 35, "y": 40, "hold_sec": 0.3},
            {"x": 30, "y": 35, "hold_sec": 0.3},
            {"x": 30, "y": 25, "hold_sec": 0.3},
            {"x": 25, "y": 20, "hold_sec": 0.3},
            {"x": 30, "y": 15, "hold_sec": 0.3},
            {"x": 35, "y": 20, "hold_sec": 0.3},
        ],
        "duration_seconds": 60,
        "instructions": "1. Follow the targets forming a figure-8 shape.\n2. Move smoothly through direction changes.\n3. Maintain consistent speed.\n4. Keep the pattern as symmetric as possible.\n5. Complete at least 1 full figure-8.",
        "suitable_stroke_types": ["ischemic", "tia"],
        "min_severity": 3,
        "max_severity": 5,
        "icon_name": "infinity",
        "target_radius": 5.0,
        "speed_requirement": "normal",
    },

    # =========================================================================
    # LEVEL 3 — HIGH / ADVANCED (Fast — Normal person speed or faster)
    # Small targets (radius 3 cm), strict scoring, timed challenges.
    # =========================================================================
    {
        "name": "Speed Drill",
        "description": "Reach targets as FAST as possible! Timed exercise — each target has a 3-second window. Tests speed and motor response.",
        "category": "speed",
        "level": 3,
        "level_name": "High",
        "target_positions": [
            {"x": 42, "y": 12, "hold_sec": 0.2, "time_limit": 3},
            {"x": 18, "y": 38, "hold_sec": 0.2, "time_limit": 3},
            {"x": 45, "y": 40, "hold_sec": 0.2, "time_limit": 3},
            {"x": 12, "y": 15, "hold_sec": 0.2, "time_limit": 3},
            {"x": 38, "y": 28, "hold_sec": 0.2, "time_limit": 3},
            {"x": 22, "y": 42, "hold_sec": 0.2, "time_limit": 3},
        ],
        "duration_seconds": 30,
        "instructions": "1. ⚡ SPEED MODE — Move as fast as you can!\n2. A target appears — reach it within 3 seconds.\n3. Quick tap — no need to hold.\n4. Score is based on speed AND accuracy.\n5. Beat the clock!",
        "suitable_stroke_types": ["ischemic", "tia"],
        "min_severity": 4,
        "max_severity": 5,
        "icon_name": "zap",
        "target_radius": 3.5,
        "speed_requirement": "fast",
    },
    {
        "name": "Random React",
        "description": "React to RANDOMLY appearing targets within 2 seconds! Tests reflexes and fast motor response — like a normal person or faster.",
        "category": "speed",
        "level": 3,
        "level_name": "High",
        "target_positions": [
            {"x": 40, "y": 20, "hold_sec": 0.1, "time_limit": 2},
            {"x": 20, "y": 40, "hold_sec": 0.1, "time_limit": 2},
            {"x": 45, "y": 35, "hold_sec": 0.1, "time_limit": 2},
            {"x": 15, "y": 15, "hold_sec": 0.1, "time_limit": 2},
            {"x": 35, "y": 45, "hold_sec": 0.1, "time_limit": 2},
            {"x": 25, "y": 10, "hold_sec": 0.1, "time_limit": 2},
            {"x": 42, "y": 42, "hold_sec": 0.1, "time_limit": 2},
            {"x": 18, "y": 30, "hold_sec": 0.1, "time_limit": 2},
        ],
        "duration_seconds": 30,
        "instructions": "1. ⚡ REACTION MODE — Be ready!\n2. Targets appear at RANDOM positions.\n3. You have only 2 SECONDS per target.\n4. Move fast! Miss = penalty.\n5. How many can you hit?",
        "suitable_stroke_types": ["ischemic", "tia"],
        "min_severity": 4,
        "max_severity": 5,
        "icon_name": "crosshair",
        "target_radius": 3.0,
        "speed_requirement": "fast",
    },
    {
        "name": "Precision Touch",
        "description": "Touch very SMALL targets with pinpoint accuracy. Tests fine motor control at normal-to-fast speed.",
        "category": "precision",
        "level": 3,
        "level_name": "High",
        "target_positions": [
            {"x": 38, "y": 22, "hold_sec": 0.5},
            {"x": 28, "y": 38, "hold_sec": 0.5},
            {"x": 42, "y": 32, "hold_sec": 0.5},
            {"x": 22, "y": 18, "hold_sec": 0.5},
            {"x": 35, "y": 42, "hold_sec": 0.5},
            {"x": 18, "y": 28, "hold_sec": 0.5},
        ],
        "duration_seconds": 45,
        "instructions": "1. 🎯 PRECISION MODE — Accuracy is everything!\n2. Targets are SMALL — aim carefully.\n3. Hold on the target for 0.5 seconds to register.\n4. Overshooting or tremor will lower your score.\n5. Aim for 95%+ accuracy!",
        "suitable_stroke_types": ["ischemic", "tia", "brainstem"],
        "min_severity": 3,
        "max_severity": 5,
        "icon_name": "crosshair",
        "target_radius": 3.0,
        "speed_requirement": "fast",
    },
    {
        "name": "Rapid Sequential",
        "description": "Hit 8 targets in RAPID sequence! Combines speed, accuracy, and endurance — the ultimate rehabilitation challenge.",
        "category": "speed",
        "level": 3,
        "level_name": "High",
        "target_positions": [
            {"x": 40, "y": 10, "hold_sec": 0.1, "time_limit": 2.5},
            {"x": 20, "y": 35, "hold_sec": 0.1, "time_limit": 2.5},
            {"x": 45, "y": 30, "hold_sec": 0.1, "time_limit": 2.5},
            {"x": 15, "y": 15, "hold_sec": 0.1, "time_limit": 2.5},
            {"x": 38, "y": 42, "hold_sec": 0.1, "time_limit": 2.5},
            {"x": 22, "y": 22, "hold_sec": 0.1, "time_limit": 2.5},
            {"x": 42, "y": 18, "hold_sec": 0.1, "time_limit": 2.5},
            {"x": 18, "y": 40, "hold_sec": 0.1, "time_limit": 2.5},
        ],
        "duration_seconds": 30,
        "instructions": "1. ⚡🎯 ULTIMATE CHALLENGE — Speed + Accuracy!\n2. Hit ALL 8 targets in rapid succession.\n3. Each target has 2.5 seconds.\n4. Score is based on: hits, speed, and accuracy.\n5. Can you complete the full sequence?",
        "suitable_stroke_types": ["ischemic", "tia"],
        "min_severity": 4,
        "max_severity": 5,
        "icon_name": "zap",
        "target_radius": 3.0,
        "speed_requirement": "fast",
    },
]


# ==============================================================================
# EXERCISE PROGRAM GENERATOR — Disease-Specific Recommendations
# ==============================================================================

def get_exercise_program(stroke_type, severity_level):
    """
    Returns a recommended exercise program based on patient's stroke type and severity.
    
    Stroke Type Mapping:
      - ischemic:    Fine motor focus → gradual progression through all 3 levels
      - hemorrhagic: Controlled movements → Level 1-2, slow progression
      - tia:         Preventive → Can handle Level 2-3 if severity allows
      - brainstem:   Bilateral coordination → Level 1-2 focus
    
    Severity Levels:
      1 = Severe (paralysis) → Level 1 only
      2 = Moderate-Severe    → Level 1, some Level 2
      3 = Moderate           → Level 1-2
      4 = Mild               → Level 2-3
      5 = Near-Recovery      → All levels, emphasis on Level 3
    
    Parameters:
        stroke_type: one of 'ischemic', 'hemorrhagic', 'tia', 'brainstem'
        severity_level: integer 1-5
        
    Returns:
        dict with recommended exercises, program name, and description
    """
    stroke_type = (stroke_type or "ischemic").lower()
    severity_level = max(1, min(5, severity_level or 3))

    # Determine which levels are unlocked based on severity
    if severity_level <= 1:
        unlocked_levels = [1]
    elif severity_level == 2:
        unlocked_levels = [1, 2]
    elif severity_level == 3:
        unlocked_levels = [1, 2]
    elif severity_level == 4:
        unlocked_levels = [1, 2, 3]
    else:  # 5
        unlocked_levels = [1, 2, 3]

    # Further restrict based on stroke type
    if stroke_type == "hemorrhagic":
        # Conservative — cap at Level 2 unless severity is 5
        if severity_level < 5:
            unlocked_levels = [l for l in unlocked_levels if l <= 2]
    elif stroke_type == "brainstem":
        # Bilateral focus — mostly Level 1-2
        if severity_level < 4:
            unlocked_levels = [l for l in unlocked_levels if l <= 2]

    # Filter exercises by stroke type, severity range, and unlocked levels
    recommended = []
    for ex in EXERCISE_LIBRARY:
        if ex["level"] not in unlocked_levels:
            continue
        if stroke_type not in ex["suitable_stroke_types"]:
            continue
        if severity_level < ex["min_severity"] or severity_level > ex["max_severity"]:
            continue
        recommended.append(ex)

    # Program metadata
    level_names = {1: "Basic", 2: "Moderate", 3: "High (Advanced)"}
    available_levels = sorted(set(ex["level"] for ex in recommended)) if recommended else [1]
    program_levels_str = " → ".join(level_names.get(l, str(l)) for l in available_levels)

    stroke_names = {
        "ischemic": "Ischemic Stroke",
        "hemorrhagic": "Hemorrhagic Stroke",
        "tia": "Transient Ischemic Attack (TIA)",
        "brainstem": "Brainstem Stroke",
    }

    severity_names = {
        1: "Severe",
        2: "Moderate-Severe",
        3: "Moderate",
        4: "Mild",
        5: "Near-Recovery",
    }

    program_name = f"{stroke_names.get(stroke_type, stroke_type)} — {severity_names.get(severity_level, '')} Program"
    program_desc = (
        f"Tailored rehabilitation program for {stroke_names.get(stroke_type, stroke_type)} patients "
        f"at {severity_names.get(severity_level, '')} level. "
        f"Available exercise levels: {program_levels_str}."
    )

    return {
        "program_name": program_name,
        "program_description": program_desc,
        "stroke_type": stroke_type,
        "severity_level": severity_level,
        "unlocked_levels": available_levels,
        "exercises": recommended,
        "total_exercises": len(recommended),
    }


def seed_exercises(db, Exercise):
    """
    Seeds the database with all 12 exercises if the table is empty.
    Call this on first app startup.
    
    Parameters:
        db: SQLAlchemy database instance
        Exercise: Exercise model class
    """
    if Exercise.query.count() > 0:
        return  # Already seeded

    for ex_data in EXERCISE_LIBRARY:
        exercise = Exercise(
            name=ex_data["name"],
            description=ex_data["description"],
            category=ex_data["category"],
            level=ex_data["level"],
            level_name=ex_data["level_name"],
            target_positions_json=json.dumps(ex_data["target_positions"]),
            duration_seconds=ex_data["duration_seconds"],
            instructions=ex_data["instructions"],
            suitable_stroke_types_json=json.dumps(ex_data["suitable_stroke_types"]),
            min_severity=ex_data["min_severity"],
            max_severity=ex_data["max_severity"],
            icon_name=ex_data["icon_name"],
            target_radius=ex_data["target_radius"],
            speed_requirement=ex_data["speed_requirement"],
        )
        db.session.add(exercise)

    db.session.commit()
    print(f"Seeded {len(EXERCISE_LIBRARY)} exercises into database.")
