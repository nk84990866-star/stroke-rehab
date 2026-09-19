"""
Report Generator Service for NeuroMotion AI
Generates clinical reports and AI recommendations.
"""
from datetime import datetime

def generate_session_report(session, user, exercise):
    """
    Evaluates session data and generates clinical AI recommendations.
    """
    accuracy = session.avg_accuracy_score
    rom = session.max_rom_achieved
    smoothness = session.movement_smoothness_score
    velocity = session.avg_joint_velocity

    recommendations = []
    
    # Analyze accuracy
    if accuracy >= 90:
        recommendations.append("Excellent precision achieved. Recommended to try a higher difficulty level or a faster speed setting.")
    elif accuracy >= 70:
        recommendations.append("Good accuracy. Continue training at current level to stabilize movement patterns.")
    else:
        recommendations.append("Accuracy is below target. Focus on reaching slowly and holding your arm steady at the targets.")

    # Analyze range of motion (ROM)
    if rom >= 135:
        recommendations.append("Range of motion is near-normal. Maintain training to build muscular endurance.")
    elif rom >= 90:
        recommendations.append("Moderate joint extension. Keep expanding joint movement; consider using arm supporting tables.")
    else:
        recommendations.append("Severely limited range of motion. Recommend active-assisted therapist guidance and physical support.")

    # Analyze movement smoothness
    if smoothness >= 80:
        recommendations.append("High coordination with minimal velocity jerks. Smooth motor path indicates strong neuroplastic recovery.")
    elif smoothness >= 50:
        recommendations.append("Moderate jerkiness. Focus on single, continuous movements instead of segment-by-segment reaching.")
    else:
        recommendations.append("Highly fragmented reaching patterns. Patient is relying heavily on secondary corrective motions. Focus on slow, passive ranges of motion.")

    # High speed analysis
    if exercise.level == 3:
        if accuracy >= 85:
            recommendations.append("Outstanding speed performance. Patient is achieving speeds resembling functional healthy levels.")
        else:
            recommendations.append("Speed is high but accuracy suffered. Slow down to prioritize landing accuracy before pushing for rapid movement.")

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
