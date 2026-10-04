import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateProjectedElbowDiagnostic } from '../src/lib/poseGeometry.js';

test('diagnostic uses runtime aspect ratio for pixel-equivalent geometry', () => {
  const result = calculateProjectedElbowDiagnostic(
    { x: 1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    640,
    480,
  );

  assert.equal(result.geometry_status, 'valid');
  assert.equal(result.shoulder_elbow_dx_norm, 1);
  assert.equal(result.shoulder_elbow_dy_norm, 0);
  assert.equal(result.elbow_wrist_dx_norm, 1);
  assert.equal(result.elbow_wrist_dy_norm, 1);
  assert.equal(result.shoulder_elbow_distance_px, 640);
  assert.equal(result.elbow_wrist_distance_px, 800);
  assert.equal(result.shoulder_elbow_distance_diagonal_ratio, 0.8);
  assert.equal(result.elbow_wrist_distance_diagonal_ratio, 1);
  assert.ok(Math.abs(result.aspect_corrected_angle_deg - 36.86989764584401) < 1e-10);
});

test('diagnostic preserves very small nonzero geometry without applying a threshold', () => {
  const result = calculateProjectedElbowDiagnostic(
    { x: 1e-12, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1e-12 },
    640,
    480,
  );

  assert.equal(result.geometry_status, 'valid');
  assert.ok(result.shoulder_elbow_distance_px > 0);
  assert.ok(result.elbow_wrist_distance_px > 0);
  assert.equal(result.aspect_corrected_angle_deg, 90);
});

test('diagnostic records missing and zero-length geometry as invalid', () => {
  const missing = calculateProjectedElbowDiagnostic(null, { x: 0, y: 0 }, { x: 1, y: 1 }, 640, 480);
  const zeroLength = calculateProjectedElbowDiagnostic(
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    640,
    480,
  );

  assert.equal(missing.geometry_status, 'missing_landmark');
  assert.equal(missing.aspect_corrected_angle_deg, null);
  assert.equal(zeroLength.geometry_status, 'zero_length_segment');
  assert.equal(zeroLength.aspect_corrected_angle_deg, null);
});

test('diagnostic identifies invalid coordinates and video dimensions', () => {
  const invalidCoordinate = calculateProjectedElbowDiagnostic(
    { x: Number.NaN, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    640,
    480,
  );
  const invalidDimensions = calculateProjectedElbowDiagnostic(
    { x: 1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    0,
    480,
  );

  assert.equal(invalidCoordinate.geometry_status, 'invalid_coordinate');
  assert.equal(invalidDimensions.geometry_status, 'invalid_video_dimensions');
  assert.equal(invalidDimensions.shoulder_elbow_dx_norm, 1);
  assert.equal(invalidDimensions.shoulder_elbow_distance_px, null);
});
