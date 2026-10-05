export function createTargetOpportunityState() {
  return {
    lastPresentedIndex: null,
    lastHitIndex: null,
    totalTargets: 0,
    targetsHit: 0,
  };
}

export function recordTargetPresentation(state, targetIndex) {
  if (!Number.isInteger(targetIndex) || targetIndex < 0) return state;
  if (state.lastPresentedIndex === targetIndex) return state;

  return {
    ...state,
    lastPresentedIndex: targetIndex,
    totalTargets: state.totalTargets + 1,
  };
}

export function recordTargetHit(state, targetIndex) {
  if (
    !Number.isInteger(targetIndex) ||
    state.lastPresentedIndex !== targetIndex ||
    state.lastHitIndex === targetIndex
  ) {
    return state;
  }

  return {
    ...state,
    lastHitIndex: targetIndex,
    targetsHit: state.targetsHit + 1,
  };
}
