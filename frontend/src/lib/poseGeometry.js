const isValidPoint = (point) =>
  point !== null &&
  typeof point === 'object' &&
  Number.isFinite(point.x) &&
  Number.isFinite(point.y);

const getVisibilityStatus = (landmark) => {
  if (landmark == null) return 'missing_landmark';
  if (typeof landmark !== 'object') return 'invalid_landmark';
  if (!('visibility' in landmark)) return 'missing_visibility';
  return Number.isFinite(landmark.visibility) ? 'valid' : 'invalid_visibility';
};

const withGeometryStatus = (result, status) => ({
  ...result,
  aspect_corrected_geometry_status: status,
  geometry_status: status,
});

const calculateAngle = (firstRay, secondRay, firstLength, secondLength) => {
  if (
    !Number.isFinite(firstLength) ||
    !Number.isFinite(secondLength) ||
    firstLength === 0 ||
    secondLength === 0
  ) {
    return null;
  }

  const normalizedDot =
    (firstRay.x / firstLength) * (secondRay.x / secondLength) +
    (firstRay.y / firstLength) * (secondRay.y / secondLength);
  if (!Number.isFinite(normalizedDot)) return null;

  const cosine = Math.max(-1, Math.min(1, normalizedDot));
  const angle = (Math.acos(cosine) * 180) / Math.PI;
  return Number.isFinite(angle) ? angle : null;
};

/**
 * Calculates the aspect-corrected included angle between shoulder-elbow and
 * wrist-elbow rays using the runtime image dimensions.
 * This remains a 2D image-plane projection, not a calibrated 3D angle.
 *
 * @param {{x: number, y: number, visibility: number}} shoulder
 * @param {{x: number, y: number, visibility: number}} elbow
 * @param {{x: number, y: number, visibility: number}} wrist
 * @param {number} imageWidth Runtime video width in pixels.
 * @param {number} imageHeight Runtime video height in pixels.
 * @returns {number | null} Included angle in degrees, or null for invalid data.
 */
export function calculateProjectedElbowAngle(
  shoulder,
  elbow,
  wrist,
  imageWidth,
  imageHeight,
) {
  if (
    ![shoulder, elbow, wrist].every(isValidPoint) ||
    [shoulder, elbow, wrist].some(
      (landmark) => getVisibilityStatus(landmark) !== 'valid',
    ) ||
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return null;
  }

  const shoulderRay = {
    x: (shoulder.x - elbow.x) * imageWidth,
    y: (shoulder.y - elbow.y) * imageHeight,
  };
  const wristRay = {
    x: (wrist.x - elbow.x) * imageWidth,
    y: (wrist.y - elbow.y) * imageHeight,
  };
  const shoulderLength = Math.hypot(shoulderRay.x, shoulderRay.y);
  const wristLength = Math.hypot(wristRay.x, wristRay.y);
  return calculateAngle(shoulderRay, wristRay, shoulderLength, wristLength);
}

/**
 * Collects unfiltered geometry for local diagnostics only. Raw normalized
 * geometry and aspect-corrected pixel-equivalent geometry are reported
 * separately; segment ratios are relative to the image diagonal.
 */
export function calculateProjectedElbowDiagnostic(
  shoulder,
  elbow,
  wrist,
  imageWidth,
  imageHeight,
) {
  const visibilityStatus = {
    shoulder: getVisibilityStatus(shoulder),
    elbow: getVisibilityStatus(elbow),
    wrist: getVisibilityStatus(wrist),
  };
  const visibilityValid = Object.values(visibilityStatus).every(
    (status) => status === 'valid',
  );
  const emptyResult = {
    visibility_status: visibilityStatus,
    visibility_valid: visibilityValid,
    shoulder_elbow_dx_norm: null,
    shoulder_elbow_dy_norm: null,
    elbow_wrist_dx_norm: null,
    elbow_wrist_dy_norm: null,
    shoulder_elbow_distance_norm: null,
    elbow_wrist_distance_norm: null,
    raw_normalized_angle_deg: null,
    raw_normalized_geometry_status: 'missing_landmark',
    shoulder_elbow_distance_px: null,
    elbow_wrist_distance_px: null,
    shoulder_elbow_distance_diagonal_ratio: null,
    elbow_wrist_distance_diagonal_ratio: null,
    aspect_corrected_angle_deg: null,
    aspect_corrected_geometry_status: 'missing_landmark',
    geometry_status: 'missing_landmark',
  };

  if (shoulder == null || elbow == null || wrist == null) {
    return withGeometryStatus(emptyResult, 'missing_landmark');
  }
  if (![shoulder, elbow, wrist].every(isValidPoint)) {
    return withGeometryStatus(
      { ...emptyResult, raw_normalized_geometry_status: 'invalid_coordinate' },
      'invalid_coordinate',
    );
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
    return withGeometryStatus(
      { ...emptyResult, raw_normalized_geometry_status: 'invalid_geometry' },
      'invalid_geometry',
    );
  }

  const shoulderRayNorm = {
    x: shoulderElbowDxNorm,
    y: shoulderElbowDyNorm,
  };
  const wristRayNorm = {
    x: elbowWristDxNorm,
    y: elbowWristDyNorm,
  };
  const shoulderLengthNorm = Math.hypot(shoulderRayNorm.x, shoulderRayNorm.y);
  const wristLengthNorm = Math.hypot(wristRayNorm.x, wristRayNorm.y);
  const rawAngle = calculateAngle(
    shoulderRayNorm,
    wristRayNorm,
    shoulderLengthNorm,
    wristLengthNorm,
  );
  const rawGeometryStatus =
    !Number.isFinite(shoulderLengthNorm) || !Number.isFinite(wristLengthNorm)
      ? 'invalid_geometry'
      : shoulderLengthNorm === 0 || wristLengthNorm === 0
        ? 'zero_length_segment'
        : rawAngle === null
          ? 'invalid_geometry'
          : 'valid';
  const normalizedResult = {
    ...emptyResult,
    shoulder_elbow_dx_norm: shoulderElbowDxNorm,
    shoulder_elbow_dy_norm: shoulderElbowDyNorm,
    elbow_wrist_dx_norm: elbowWristDxNorm,
    elbow_wrist_dy_norm: elbowWristDyNorm,
    shoulder_elbow_distance_norm: shoulderLengthNorm,
    elbow_wrist_distance_norm: wristLengthNorm,
    raw_normalized_angle_deg: rawAngle,
    raw_normalized_geometry_status: rawGeometryStatus,
  };

  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return withGeometryStatus(normalizedResult, 'invalid_video_dimensions');
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
  if (
    ![shoulderLength, wristLength, imageDiagonal].every(Number.isFinite) ||
    imageDiagonal === 0
  ) {
    return withGeometryStatus(normalizedResult, 'invalid_geometry');
  }

  const shoulderDiagonalRatio = shoulderLength / imageDiagonal;
  const wristDiagonalRatio = wristLength / imageDiagonal;
  const geometryResult = {
    ...normalizedResult,
    shoulder_elbow_distance_px: shoulderLength,
    elbow_wrist_distance_px: wristLength,
    shoulder_elbow_distance_diagonal_ratio: shoulderDiagonalRatio,
    elbow_wrist_distance_diagonal_ratio: wristDiagonalRatio,
  };
  if (![shoulderDiagonalRatio, wristDiagonalRatio].every(Number.isFinite)) {
    return withGeometryStatus(geometryResult, 'invalid_geometry');
  }
  if (shoulderLength === 0 || wristLength === 0) {
    return withGeometryStatus(geometryResult, 'zero_length_segment');
  }

  const angle = calculateAngle(shoulderRay, wristRay, shoulderLength, wristLength);
  if (angle === null) {
    return withGeometryStatus(geometryResult, 'invalid_geometry');
  }

  return {
    ...geometryResult,
    aspect_corrected_angle_deg: angle,
    aspect_corrected_geometry_status: 'valid',
    geometry_status: 'valid',
  };
}
