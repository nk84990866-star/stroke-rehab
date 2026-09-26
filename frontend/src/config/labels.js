/**
 * Shared display labels & maps used across pages.
 * Single source of truth so pages never drift apart.
 */
import {
  Activity,
  Award,
  Crosshair,
  Dumbbell,
  Gauge,
  Flame,
  Hand,
  HeartPulse,
  Layers,
  Lock,
  Move,
  RotateCcw,
  ShieldAlert,
  Star,
  Target,
  Trophy,
  Waves,
  Zap,
} from 'lucide-react';

export const STROKE_TYPE_LABELS = {
  ischemic: 'Ischemic Stroke',
  hemorrhagic: 'Hemorrhagic Stroke',
  tia: 'TIA (Mini Stroke)',
  brainstem: 'Brainstem Stroke',
};

/** Short forms for compact chips (e.g. on exercise cards). */
export const STROKE_TYPE_SHORT_LABELS = {
  ischemic: 'Ischemic',
  hemorrhagic: 'Hemorrhagic',
  tia: 'TIA',
  brainstem: 'Brainstem',
};

export const AFFECTED_SIDE_LABELS = {
  left: 'Left side affected',
  right: 'Right side affected',
};

export const SEVERITY_LABELS = {
  1: 'Severe paralysis',
  2: 'Moderate-severe',
  3: 'Moderate',
  4: 'Mild',
  5: 'Recovery phase',
};

/** Exercise difficulty levels (1-3) → Badge variant + display name. */
export const EXERCISE_LEVELS = {
  1: { name: 'Basic', badge: 'success' },
  2: { name: 'Moderate', badge: 'warning' },
  3: { name: 'High', badge: 'danger' },
};

/** Exercise categories → label + icon. */
export const EXERCISE_CATEGORY_LABELS = {
  rom: 'Range of Motion',
  coordination: 'Coordination',
  speed: 'Speed',
  precision: 'Precision',
};

export const EXERCISE_CATEGORY_ICONS = {
  rom: Waves,
  coordination: Crosshair,
  speed: Gauge,
  precision: Target,
};

/** Speed requirement → friendly label. */
export const SPEED_LABELS = {
  slow: 'Slow & controlled',
  normal: 'Normal pace',
  fast: 'Fast-paced',
};

/**
 * Badge keys used by backend gamification (services/gamification.py) → name + icon.
 * Shared by AchievementsPage and the dashboard achievements preview.
 */
export const BADGE_META = {
  first_session: { name: 'First Reaches', icon: Award },
  streak_3: { name: 'Consistent Start', icon: Flame },
  streak_7: { name: 'Weekly Warrior', icon: Flame },
  perfect_score: { name: 'Precision Master', icon: Star },
  rom_milestone_90: { name: '90-Degree Reach', icon: Award },
  rom_milestone_135: { name: '135-Degree Extension', icon: Award },
  level_2_unlocked: { name: 'Moderate Explorer', icon: ShieldAlert },
  level_3_unlocked: { name: 'High Velocity Athlete', icon: ShieldAlert },
  sessions_10: { name: 'Ten Sessions', icon: Dumbbell },
  sessions_25: { name: 'Twenty-Five Sessions', icon: Trophy },
  variety_5: { name: 'Exercise Explorer', icon: Layers },
};

/**
 * Real-progress definitions for locked badges. `current` sources:
 *  - sessions_count / distinct_exercises: real saved sessions (/api/sessions)
 *  - streak: existing backend streak (/api/sessions/stats)
 *  - best_score: real stored session scores (/api/sessions/stats)
 * Anything without a reliable current value renders the requirement only.
 */
export const BADGE_PROGRESS = {
  sessions_10: { current: 'sessions_count', target: 10 },
  sessions_25: { current: 'sessions_count', target: 25 },
  streak_3: { current: 'streak', target: 3 },
  streak_7: { current: 'streak', target: 7 },
  variety_5: { current: 'distinct_exercises', target: 5 },
  perfect_score: { current: 'best_score', target: 95 },
};

/** icon_name values stored in the Exercise model → lucide icons. */
export const EXERCISE_ICONS = {
  hand: Hand,
  move: Move,
  lock: Lock,
  'rotate-ccw': RotateCcw,
  activity: Activity,
  zap: Zap,
  target: Target,
  heart: HeartPulse,
};

export const getExerciseIcon = (iconName) => EXERCISE_ICONS[iconName] || Activity;
