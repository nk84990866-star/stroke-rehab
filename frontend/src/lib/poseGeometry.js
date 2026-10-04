/**
 * Calculates the included angle between shoulder-elbow and wrist-elbow rays
 * using MediaPipe image coordinates.
 *
 * This is a 2D image-plane projected elbow angle, not a calibrated anatomical
 * 3D angle. Perspective, foreshortening, and out-of-plane motion can affect
 * it. The result is independent of uniform translation and uniform scaling
 * of the points.
 *
 * @param {{x: number, y: number}} shoulder
 * @param {{x: number, y: number}} elbow
 * @param {{x: number, y: number}} wrist
 * @returns {number | null} Included angle in degrees, or null for invalid geometry.
 */
export function calculateProjectedElbowAngle(shoulder, elbow, wrist) {
  const isValidPoint = (point) =>
    point !== null &&
    typeof point === 'object' &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y);

  if (!isValidPoint(shoulder) || !isValidPoint(elbow) || !isValidPoint(wrist)) {
    return null;
  }

  const shoulderRay = {
    x: shoulder.x - elbow.x,
    y: shoulder.y - elbow.y,
  };
  const wristRay = {
    x: wrist.x - elbow.x,
    y: wrist.y - elbow.y,
  };
  const shoulderLength = Math.hypot(shoulderRay.x, shoulderRay.y);
  const wristLength = Math.hypot(wristRay.x, wristRay.y);

  if (
    !Number.isFinite(shoulderLength) ||
    !Number.isFinite(wristLength) ||
    shoulderLength === 0 ||
    wristLength === 0
  ) {
    return null;
  }

  const normalizedDot =
    (shoulderRay.x / shoulderLength) * (wristRay.x / wristLength) +
    (shoulderRay.y / shoulderLength) * (wristRay.y / wristLength);
  const cosine = Math.max(-1, Math.min(1, normalizedDot));

  return (Math.acos(cosine) * 180) / Math.PI;
}
