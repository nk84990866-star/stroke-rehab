import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTargetOpportunityState,
  recordTargetHit,
  recordTargetPresentation,
} from '../src/lib/targetOpportunities.js';

test('single configured target opportunity can be hit once', () => {
  let state = createTargetOpportunityState();
  state = recordTargetPresentation(state, 0);
  state = recordTargetHit(state, 0);

  assert.equal(state.totalTargets, 1);
  assert.equal(state.targetsHit, 1);
});

test('multi-target normal sequence counts each presented opportunity and hit', () => {
  let state = createTargetOpportunityState();
  for (const targetIndex of [0, 1, 2]) {
    state = recordTargetPresentation(state, targetIndex);
    state = recordTargetHit(state, targetIndex);
  }

  assert.equal(state.totalTargets, 3);
  assert.equal(state.targetsHit, 3);
});

test('multi-cycle sequence counts opportunities beyond configured positions', () => {
  let state = createTargetOpportunityState();
  const configuredPositions = Array.from({ length: 8 }, (_, index) => index);
  const presentedPositions = [];

  for (let opportunityIndex = 0; opportunityIndex < 9; opportunityIndex += 1) {
    presentedPositions.push(configuredPositions[opportunityIndex % configuredPositions.length]);
    state = recordTargetPresentation(state, opportunityIndex);
    if (opportunityIndex !== 8) state = recordTargetHit(state, opportunityIndex);
  }

  assert.equal(presentedPositions.length, 9);
  assert.equal(presentedPositions[8], configuredPositions[0]);
  assert.equal(state.totalTargets, 9);
  assert.equal(state.targetsHit, 8);
  assert.equal(state.targetsHit / state.totalTargets, 8 / 9);
});

test('timed-out presentation counts as an opportunity but not a hit', () => {
  let state = createTargetOpportunityState();
  state = recordTargetPresentation(state, 0);
  state = recordTargetPresentation(state, 1);
  state = recordTargetHit(state, 1);

  assert.equal(state.totalTargets, 2);
  assert.equal(state.targetsHit, 1);
});

test('final active presentation is counted before session completion', () => {
  let state = createTargetOpportunityState();
  state = recordTargetPresentation(state, 0);
  state = recordTargetHit(state, 0);
  state = recordTargetPresentation(state, 1);

  assert.equal(state.totalTargets, 2);
  assert.equal(state.targetsHit, 1);
});

test('repeated frames do not recount a presented target or its hit', () => {
  let state = createTargetOpportunityState();
  state = recordTargetPresentation(state, 0);
  const firstHit = recordTargetHit(state, 0);
  state = recordTargetPresentation(state, 0);
  state = recordTargetHit(state, 0);

  assert.equal(state.totalTargets, 1);
  assert.equal(state.targetsHit, 1);
  assert.equal(firstHit.totalTargets, 1);
});
