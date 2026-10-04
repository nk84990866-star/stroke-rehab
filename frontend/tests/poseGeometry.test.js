import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateProjectedElbowAngle,
  calculateProjectedElbowDiagnostic,
} from '../src/lib/poseGeometry.js';

const landmark = (x, y, visibility = 0.9) => ({ x, y, visibility });

test('diagnostic uses runtime aspect ratio for pixel-equivalent geometry', () => {
  const result = calculateProjectedElbowDiagnostic(
    landmark(1, 0),
    landmark(0, 0),
    landmark(1, 1),
    640,
    480,
  );

  assert.equal(result.geometry_status, 'valid');
  assert.equal(result.aspect_corrected_geometry_status, 'valid');
  assert.equal(result.visibility_valid, true);
  assert.equal(result.raw_normalized_geometry_status, 'valid');
  assert.equal(result.shoulder_elbow_dx_norm, 1);
  assert.equal(result.shoulder_elbow_dy_norm, 0);
  assert.equal(result.elbow_wrist_dx_norm, 1);
  assert.equal(result.elbow_wrist_dy_norm, 1);
  assert.equal(result.shoulder_elbow_distance_norm, 1);
  assert.equal(result.elbow_wrist_distance_norm, Math.sqrt(2));
  assert.ok(Math.abs(result.raw_normalized_angle_deg - 45) < 1e-10);
  assert.equal(result.shoulder_elbow_distance_px, 640);
  assert.equal(result.elbow_wrist_distance_px, 800);
  assert.equal(result.shoulder_elbow_distance_diagonal_ratio, 0.8);
  assert.equal(result.elbow_wrist_distance_diagonal_ratio, 1);
  assert.ok(Math.abs(result.aspect_corrected_angle_deg - 36.86989764584401) < 1e-10);
});

test('square dimensions preserve normalized geometry', () => {
  const result = calculateProjectedElbowDiagnostic(
    landmark(1, 0),
    landmark(0, 0),
    landmark(1, 1),
    480,
    480,
  );

  assert.equal(result.geometry_status, 'valid');
  assert.equal(result.aspect_corrected_geometry_status, 'valid');
  assert.equal(result.aspect_corrected_angle_deg, result.raw_normalized_angle_deg);
  assert.ok(Math.abs(result.aspect_corrected_angle_deg - 45) < 1e-10);
});

test('angle capture requires finite visibility without a visibility cutoff', () => {
  const shoulder = landmark(1, 0, 0);
  const elbow = landmark(0, 0, 0.1);
  const wrist = landmark(1, 1, 1);

  assert.equal(calculateProjectedElbowAngle(shoulder, elbow, wrist, 640, 480), 36.86989764584401);
  assert.equal(
    calculateProjectedElbowAngle({ x: 1, y: 0 }, elbow, wrist, 640, 480),
    null,
  );
  assert.equal(
    calculateProjectedElbowAngle(landmark(1, 0, Number.NaN), elbow, wrist, 640, 480),
    null,
  );
  assert.equal(
    calculateProjectedElbowAngle(landmark(1, 0, Infinity), elbow, wrist, 640, 480),
    null,
  );
});

test('diagnostic separates invalid visibility from geometry validity', () => {
  const result = calculateProjectedElbowDiagnostic(
    { x: 1, y: 0 },
    landmark(0, 0),
    landmark(1, 1),
    640,
    480,
  );

  assert.equal(result.visibility_valid, false);
  assert.equal(result.visibility_status.shoulder, 'missing_visibility');
  assert.equal(result.geometry_status, 'valid');
  assert.ok(Number.isFinite(result.aspect_corrected_angle_deg));
  assert.equal(
    calculateProjectedElbowAngle({ x: 1, y: 0 }, landmark(0, 0), landmark(1, 1), 640, 480),
    null,
  );
});

test('diagnostic preserves very small nonzero geometry without applying a threshold', () => {
  const result = calculateProjectedElbowDiagnostic(
    landmark(1e-12, 0),
    landmark(0, 0),
    landmark(0, 1e-12),
    640,
    480,
  );

  assert.equal(result.geometry_status, 'valid');
  assert.ok(result.shoulder_elbow_distance_px > 0);
  assert.ok(result.elbow_wrist_distance_px > 0);
  assert.equal(result.aspect_corrected_angle_deg, 90);
});

test('diagnostic records missing and zero-length geometry as invalid', () => {
  const missing = calculateProjectedElbowDiagnostic(
    null,
    landmark(0, 0),
    landmark(1, 1),
    640,
    480,
  );
  const zeroLength = calculateProjectedElbowDiagnostic(
    landmark(0, 0),
    landmark(0, 0),
    landmark(1, 1),
    640,
    480,
  );

  assert.equal(missing.geometry_status, 'missing_landmark');
  assert.equal(missing.aspect_corrected_angle_deg, null);
  assert.equal(zeroLength.geometry_status, 'zero_length_segment');
  assert.equal(zeroLength.aspect_corrected_angle_deg, null);
  assert.equal(
    calculateProjectedElbowAngle(landmark(0, 0), landmark(0, 0), landmark(1, 1), 640, 480),
    null,
  );
});

test('diagnostic identifies invalid coordinates and video dimensions', () => {
  const invalidCoordinate = calculateProjectedElbowDiagnostic(
    landmark(Number.NaN, 0),
    landmark(0, 0),
    landmark(1, 1),
    640,
    480,
  );
  const invalidDimensions = calculateProjectedElbowDiagnostic(
    landmark(1, 0),
    landmark(0, 0),
    landmark(0, 1),
    0,
    480,
  );
  const nonFiniteGeometry = calculateProjectedElbowDiagnostic(
    landmark(Number.MAX_VALUE, 0),
    landmark(-Number.MAX_VALUE, 0),
    landmark(0, 1),
    640,
    480,
  );

  assert.equal(invalidCoordinate.geometry_status, 'invalid_coordinate');
  assert.equal(invalidDimensions.geometry_status, 'invalid_video_dimensions');
  assert.equal(invalidDimensions.shoulder_elbow_dx_norm, 1);
  assert.equal(invalidDimensions.shoulder_elbow_distance_px, null);
  assert.equal(nonFiniteGeometry.geometry_status, 'invalid_geometry');
  assert.equal(
    calculateProjectedElbowAngle(
      landmark(Number.MAX_VALUE, 0),
      landmark(-Number.MAX_VALUE, 0),
      landmark(0, 1),
      640,
      480,
    ),
    null,
  );
  assert.equal(
    calculateProjectedElbowAngle(landmark(1, 0), landmark(0, 0), landmark(0, 1), NaN, 480),
    null,
  );
});
