import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatReportMetric,
  formatReportText,
  formatTargetHitRatio,
  LEGACY_SMOOTHNESS_NOTE,
  SESSION_REPORT_LABELS,
} from '../src/lib/sessionReport.js';

test('missing or invalid report metrics are shown as unavailable', () => {
  assert.equal(formatReportMetric(null), 'Not available');
  assert.equal(formatReportMetric(undefined), 'Not available');
  assert.equal(formatReportMetric(''), 'Not available');
  assert.equal(formatReportMetric('not-a-number'), 'Not available');
  assert.equal(formatReportMetric(true), 'Not available');
  assert.equal(formatReportText(null), 'Not available');
  assert.equal(formatReportText('  '), 'Not available');
});

test('zero and valid report metrics retain their stored values and units', () => {
  assert.equal(formatReportMetric(0, 1, '%'), '0.0%');
  assert.equal(formatReportMetric(0, 1, ' / 100'), '0.0 / 100');
  assert.equal(formatReportMetric('42.126', 2, '°'), '42.13°');
  assert.equal(formatReportText('2m 5s'), '2m 5s');
  assert.match(LEGACY_SMOOTHNESS_NOTE, /legacy session/);
});

test('target hits preserve the API numerator and presented-opportunity denominator', () => {
  assert.equal(formatTargetHitRatio('3 / 7'), '3 / 7');
  assert.equal(formatTargetHitRatio('0/4'), '0 / 4');
  assert.equal(formatTargetHitRatio('3 / 0'), '3 / 0');
  assert.equal(formatTargetHitRatio('75%'), 'Not available');
  assert.equal(formatTargetHitRatio(undefined), 'Not available');
  assert.match(SESSION_REPORT_LABELS.targetsHit, /presented target opportunities/);
  assert.doesNotMatch(SESSION_REPORT_LABELS.targetsHit, /unique/i);
});

test('exercise level label identifies the source as the exercise template', () => {
  assert.equal(SESSION_REPORT_LABELS.exerciseLevel, 'Exercise template level');
  assert.doesNotMatch(SESSION_REPORT_LABELS.exerciseLevel, /played|completed/i);
});
