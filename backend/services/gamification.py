"""
Gamification and Achievement Service for NeuroMotion AI
Handles points calculation, streak counts, and badge unlocks.
"""
from datetime import datetime, date, timedelta, timezone

BADGE_DEFINITIONS = {
    "first_session": {
        "name": "First Reaches",
        "description": "Complete your first exercise session.",
        "icon": "award"
    },
    "streak_3": {
        "name": "Consistent Start",
        "description": "Maintain a 3-day exercise streak.",
        "icon": "flame"
    },
    "streak_7": {
        "name": "Weekly Warrior",
        "description": "Maintain a 7-day exercise streak.",
        "icon": "calendar"
    },
    "perfect_score": {
        "name": "Precision Master",
        "description": "Score 95%+ overall in a single exercise session.",
        "icon": "target"
    },
    "rom_milestone_90": {
        "name": "90-Degree Reach",
        "description": "Achieve a maximum joint range of motion of 90 degrees or more.",
        "icon": "shield-check"
    },
    "rom_milestone_135": {
        "name": "135-Degree Extension",
        "description": "Achieve a maximum joint range of motion of 135 degrees or more.",
        "icon": "shield-alert"
    },
    "level_2_unlocked": {
        "name": "Moderate Explorer",
        "description": "Complete a session in Level 2 (Moderate) exercises.",
        "icon": "chevron-up"
    },
    "level_3_unlocked": {
        "name": "High Velocity Athlete",
        "description": "Complete a session in Level 3 (High/Fast) exercises.",
        "icon": "zap"
    },
    "sessions_10": {
        "name": "Ten Sessions",
        "description": "Complete 10 exercise sessions.",
        "icon": "dumbbell"
    },
    "sessions_25": {
        "name": "Twenty-Five Sessions",
        "description": "Complete 25 exercise sessions.",
        "icon": "trophy"
    },
    "variety_5": {
        "name": "Exercise Explorer",
        "description": "Complete sessions with 5 different exercises.",
        "icon": "layers"
    }
}

def calculate_session_points(session):
    """
    Calculates points awarded for completing a session.
    Base points: 100
    Accuracy multiplier: score * 1.5
    Streak bonus: 10 * current_streak
    """
    base_points = 100
    accuracy_bonus = int(session.overall_score * 1.5)
    
    # We will compute the streak bonus in check_and_update_streak
    return base_points + accuracy_bonus

def check_and_update_streak(user, today=None):
    """
    Updates the user's daily exercise streak.
    If the last session date is yesterday, streak increases by 1.
    If today, streak stays the same.
    Otherwise, streak resets to 1.
    """
    if today is None:
        today = date.today()
        
    if user.last_session_date is None:
        user.streak_count = 1
    else:
        last_date = user.last_session_date
        delta = today - last_date
        if delta.days == 1:
            user.streak_count += 1
        elif delta.days > 1:
            user.streak_count = 1
            
    user.last_session_date = today
    return user.streak_count

def check_achievements(user, session, db, Achievement):
    """
    Checks if the patient unlocked any new achievements during this session.
    Adds new achievements to the database and returns a list of newly unlocked badge keys.
    """
    unlocked_keys = []
    existing_badges = user.badges  # list of strings (keys)
    
    # 1. First Session
    if "first_session" not in existing_badges:
        unlocked_keys.append("first_session")
        
    # 2. Streak Badges
    if user.streak_count >= 3 and "streak_3" not in existing_badges:
        unlocked_keys.append("streak_3")
    if user.streak_count >= 7 and "streak_7" not in existing_badges:
        unlocked_keys.append("streak_7")
        
    # 3. Perfect Score
    if session.overall_score >= 95.0 and "perfect_score" not in existing_badges:
        unlocked_keys.append("perfect_score")
        
    # 4. Range of Motion Milestones
    if session.max_rom_achieved >= 135.0 and "rom_milestone_135" not in existing_badges:
        unlocked_keys.append("rom_milestone_135")
    if session.max_rom_achieved >= 90.0 and "rom_milestone_90" not in existing_badges:
        if "rom_milestone_90" not in existing_badges:
            unlocked_keys.append("rom_milestone_90")
            
    # 5. Level Play Unlocks
    if session.level_played == 2 and "level_2_unlocked" not in existing_badges:
        unlocked_keys.append("level_2_unlocked")
    if session.level_played == 3 and "level_3_unlocked" not in existing_badges:
        unlocked_keys.append("level_3_unlocked")

    # 6. Session count milestones (real saved sessions, including this one)
    total_sessions = user.sessions.count()
    if total_sessions >= 10 and "sessions_10" not in existing_badges:
        unlocked_keys.append("sessions_10")
    if total_sessions >= 25 and "sessions_25" not in existing_badges:
        unlocked_keys.append("sessions_25")

    # 7. Exercise variety (distinct exercises with at least one saved session)
    distinct_exercises = len({s.exercise_id for s in user.sessions.all()})
    if distinct_exercises >= 5 and "variety_5" not in existing_badges:
        unlocked_keys.append("variety_5")

    # Persist newly unlocked achievements
    for key in unlocked_keys:
        badge_info = BADGE_DEFINITIONS[key]
        achievement = Achievement(
            patient_id=user.id,
            badge_name=key,
            badge_description=badge_info["description"]
        )
        db.session.add(achievement)
        
    if unlocked_keys:
        new_badges = list(set(existing_badges + unlocked_keys))
        user.badges = new_badges
        db.session.commit()
        
    return unlocked_keys
