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

/**
 * Collects unfiltered aspect-corrected geometry for local diagnostics only.
 * Segment ratios are relative to the image diagonal, not physical dimensions.
 */
export function calculateProjectedElbowDiagnostic(shoulder, elbow, wrist, imageWidth, imageHeight) {
  const isValidPoint = (point) =>
    point !== null &&
    typeof point === 'object' &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y);
  const emptyResult = {
    shoulder_elbow_dx_norm: null,
    shoulder_elbow_dy_norm: null,
    elbow_wrist_dx_norm: null,
    elbow_wrist_dy_norm: null,
    shoulder_elbow_distance_px: null,
    elbow_wrist_distance_px: null,
    shoulder_elbow_distance_diagonal_ratio: null,
    elbow_wrist_distance_diagonal_ratio: null,
    aspect_corrected_angle_deg: null,
    geometry_status: 'missing_landmark',
  };

  if (shoulder == null || elbow == null || wrist == null) {
    return emptyResult;
  }
  if (![shoulder, elbow, wrist].every(isValidPoint)) {
    return { ...emptyResult, geometry_status: 'invalid_coordinate' };
  }

  const shoulderElbowDxNorm = shoulder.x - elbow.x;
  const shoulderElbowDyNorm = shoulder.y - elbow.y;
  const elbowWristDxNorm = wrist.x - elbow.x;
  const elbowWristDyNorm = wrist.y - elbow.y;
  const normalizedDeltas = [
    shoulderElbowDxNorm,
    shoulderElbowDyNorm,
    elbowWristDxNorm,
    elbowWristDyNorm,
  ];
  if (!normalizedDeltas.every(Number.isFinite)) {
    return { ...emptyResult, geometry_status: 'invalid_coordinate' };
  }

  const normalizedResult = {
    ...emptyResult,
    shoulder_elbow_dx_norm: shoulderElbowDxNorm,
    shoulder_elbow_dy_norm: shoulderElbowDyNorm,
    elbow_wrist_dx_norm: elbowWristDxNorm,
    elbow_wrist_dy_norm: elbowWristDyNorm,
  };
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { ...normalizedResult, geometry_status: 'invalid_video_dimensions' };
  }

  const shoulderRay = {
    x: shoulderElbowDxNorm * imageWidth,
    y: shoulderElbowDyNorm * imageHeight,
  };
  const wristRay = {
    x: elbowWristDxNorm * imageWidth,
    y: elbowWristDyNorm * imageHeight,
  };
  const shoulderLength = Math.hypot(shoulderRay.x, shoulderRay.y);
  const wristLength = Math.hypot(wristRay.x, wristRay.y);
  const imageDiagonal = Math.hypot(imageWidth, imageHeight);
  if (![shoulderLength, wristLength, imageDiagonal].every(Number.isFinite) || imageDiagonal === 0) {
    return { ...normalizedResult, geometry_status: 'invalid_geometry' };
  }

  const geometryResult = {
    ...normalizedResult,
    shoulder_elbow_distance_px: shoulderLength,
    elbow_wrist_distance_px: wristLength,
    shoulder_elbow_distance_diagonal_ratio: shoulderLength / imageDiagonal,
    elbow_wrist_distance_diagonal_ratio: wristLength / imageDiagonal,
  };
  if (shoulderLength === 0 || wristLength === 0) {
    return { ...geometryResult, geometry_status: 'zero_length_segment' };
  }

  const normalizedDot =
    (shoulderRay.x / shoulderLength) * (wristRay.x / wristLength) +
    (shoulderRay.y / shoulderLength) * (wristRay.y / wristLength);
  const cosine = Math.max(-1, Math.min(1, normalizedDot));
  const angle = (Math.acos(cosine) * 180) / Math.PI;
  if (!Number.isFinite(angle)) {
    return { ...geometryResult, geometry_status: 'invalid_geometry' };
  }

  return {
    ...geometryResult,
    aspect_corrected_angle_deg: angle,
    geometry_status: 'valid',
  };
}
