export const SESSION_REPORT_LABELS = {
  exerciseLevel: 'Exercise template level',
  accuracy: 'Average Reaching Accuracy',
  movementRange: 'Movement Range Estimate',
  targetsHit: 'Targets hit / presented target opportunities',
  averageVelocity: 'Average Movement Speed Estimate',
  smoothness: 'Movement Smoothness',
};

export const LEGACY_SMOOTHNESS_NOTE =
  'A stored score of 0 may indicate a legacy session where this metric was not recorded.';

export const formatReportMetric = (value, decimals = 2, suffix = '') => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return 'Not available';
  }
  if (typeof value !== 'number' && typeof value !== 'string') return 'Not available';

  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(decimals)}${suffix}` : 'Not available';
};

export const formatReportText = (value) =>
  typeof value === 'string' && value.trim() ? value : 'Not available';

export const formatTargetHitRatio = (value) => {
  if (typeof value !== 'string') return 'Not available';
  const match = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  return match ? `${match[1]} / ${match[2]}` : 'Not available';
};
