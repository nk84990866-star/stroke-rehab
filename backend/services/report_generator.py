"""
Report Generator Service for NeuroMotion AI
Generates session reports and rule-based training suggestions.
"""
from datetime import datetime

def generate_session_report(session, user, exercise):
    """
    Evaluates session metrics and generates rule-based training suggestions.
    """
    accuracy = session.avg_accuracy_score
    rom = session.max_rom_achieved
    smoothness = session.movement_smoothness_score
    velocity = session.avg_joint_velocity

    recommendations = []
    
    # Analyze accuracy
    if accuracy >= 90:
        recommendations.append("Session accuracy was 90% or higher. Consider trying a higher exercise difficulty or faster pace if appropriate.")
    elif accuracy >= 70:
        recommendations.append("Session accuracy was at least 70% and below 90%. Consider continuing at this exercise level and following the exercise instructions.")
    else:
        recommendations.append("Session accuracy was below 70%. Consider reaching slowly and holding steady at each target as instructed.")

    # Analyze the app-specific movement-range estimate.
    if rom >= 135:
        recommendations.append("The app recorded a maximum screen-space movement estimate of 135 or more on its degree-like scale in this session. Continue following the exercise instructions.")
    elif rom >= 90:
        recommendations.append("The app recorded a maximum screen-space movement estimate from 90 to under 135 on its degree-like scale in this session. Follow the exercise instructions and any guidance from your therapist.")
    else:
        recommendations.append("The app recorded a maximum screen-space movement estimate below 90 on its degree-like scale in this session. Follow the exercise instructions and ask your therapist for guidance if needed.")

    # Analyze movement smoothness
    if smoothness >= 80:
        recommendations.append("Your movement smoothness score was 80 or higher. Continue practicing controlled reaches as instructed.")
    elif smoothness >= 50:
        recommendations.append("Your movement smoothness score was from 50 to under 80. Consider practicing slow, continuous reaches.")
    else:
        recommendations.append("Your movement smoothness score was below 50. Consider focusing on slow, controlled reaches and following the exercise instructions.")

    # High speed analysis
    if exercise.level == 3:
        if accuracy >= 85:
            recommendations.append("At exercise level 3, session accuracy was 85% or higher. If appropriate, consider maintaining this pace while following the exercise instructions.")
        else:
            recommendations.append("At exercise level 3, session accuracy was below 85%. Consider slowing your reaches and focusing on the targets.")

    return {
        "session_id": session.id,
        "patient_name": user.full_name,
        "exercise_name": exercise.name,
        "exercise_level": exercise.level_name,
        "date": session.started_at.strftime("%Y-%b-%d %H:%M") if session.started_at else None,
        "duration": f"{session.duration_seconds // 60}m {session.duration_seconds % 60}s",
        "metrics": {
            "accuracy_score": accuracy,
            "max_rom_achieved": rom,
            "targets_hit_ratio": f"{session.targets_hit} / {session.total_targets}",
            "avg_velocity": round(velocity, 2),
            "smoothness_score": smoothness
        },
        "recommendations": recommendations
    }
