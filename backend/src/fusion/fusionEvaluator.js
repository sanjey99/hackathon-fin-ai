// ── Fusion Evaluator ─────────────────────────────────────────────────────────
//
// Evaluates a set of risk signals through the active policy profile and
// produces a governance-level decision: "allow", "review", or "block".

import { getActiveProfile, getActiveProfileName } from './policyProfiles.js';

/**
 * @typedef {Object} FusionInput
 * @property {number}   risk_score      - Composite risk score in [0,1]
 * @property {number}   [uncertainty]   - Optional uncertainty width in [0,1]
 * @property {boolean}  [stale]         - Whether input signals are stale
 * @property {Object}   [metadata]      - Arbitrary pass-through metadata
 */

/**
 * @typedef {Object} FusionResult
 * @property {string}  decision          - "allow" | "review" | "block"
 * @property {number}  risk_score        - Echo of input score
 * @property {string}  policy_profile    - Name of the profile used
 * @property {Object}  thresholds_applied - The threshold values that were used
 * @property {string}  [guard_triggered]  - Which guard was triggered, if any
 * @property {string}  ts                - ISO timestamp
 */

/**
 * Run the fusion evaluation for a given input.
 * @param {FusionInput} input
 * @returns {FusionResult}
 */
export function evaluateFusion(input) {
  const { risk_score, uncertainty, stale, metadata } = input;
  const profile = getActiveProfile();
  const profileName = profile.name;
  const { decision_thresholds, uncertainty_guard_sensitivity, stale_handling } = profile;
  const { allow_below, block_above } = decision_thresholds;

  let decision;
  let guard_triggered = null;

  // 1. Stale-signal guard (takes precedence)
  if (stale === true) {
    if (stale_handling === 'reject') {
      decision = 'block';
      guard_triggered = 'stale_reject';
    } else if (stale_handling === 'review') {
      decision = 'review';
      guard_triggered = 'stale_review';
    }
    // stale_handling === 'allow' → fall through to normal scoring
  }

  // 2. Uncertainty guard (override to review if not already blocked)
  if (!decision && typeof uncertainty === 'number' && uncertainty > 0) {
    const effective_uncertainty = uncertainty * uncertainty_guard_sensitivity;
    if (effective_uncertainty > 0.5) {
      decision = 'review';
      guard_triggered = 'uncertainty';
    }
  }

  // 3. Threshold-based decision (if no guard already decided)
  if (!decision) {
    if (risk_score < allow_below) {
      decision = 'allow';
    } else if (risk_score > block_above) {
      decision = 'block';
    } else {
      decision = 'review';
    }
  }

  const result = {
    decision,
    risk_score,
    policy_profile: profileName,
    thresholds_applied: { allow_below, block_above },
    ts: new Date().toISOString(),
  };

  if (guard_triggered) result.guard_triggered = guard_triggered;
  if (metadata !== undefined) result.metadata = metadata;

  return result;
}
