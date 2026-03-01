// ── Policy Profiles: in-memory config for fusion decision thresholds ─────────

/**
 * Profile definitions.
 *
 * Each profile controls:
 *  - decision_thresholds  : { allow_below, block_above }
 *      Scores below allow_below → "allow"
 *      Scores above block_above → "block"
 *      Everything in between     → "review"
 *  - uncertainty_guard_sensitivity : multiplier applied to uncertainty width
 *      Higher = more likely to trigger the guard (escalate to review)
 *  - stale_handling : "reject" | "review" | "allow"
 *      What to do when input signals are flagged as stale
 */

export const PROFILES = {
  strict: {
    decision_thresholds: { allow_below: 0.25, block_above: 0.65 },
    uncertainty_guard_sensitivity: 1.5,
    stale_handling: 'reject',
  },
  balanced: {
    decision_thresholds: { allow_below: 0.40, block_above: 0.75 },
    uncertainty_guard_sensitivity: 1.0,
    stale_handling: 'review',
  },
  permissive: {
    decision_thresholds: { allow_below: 0.55, block_above: 0.90 },
    uncertainty_guard_sensitivity: 0.5,
    stale_handling: 'allow',
  },
};

export const VALID_PROFILE_NAMES = Object.keys(PROFILES);

// ── Runtime state (in-memory only) ──────────────────────────────────────────

let activeProfile = 'balanced';

export function getActiveProfileName() {
  return activeProfile;
}

export function getActiveProfile() {
  return { name: activeProfile, ...PROFILES[activeProfile] };
}

/**
 * Switch the active profile.
 * @param {string} name – must be one of VALID_PROFILE_NAMES
 * @returns {{ ok: boolean, error?: string }}
 */
export function setActiveProfile(name) {
  if (!VALID_PROFILE_NAMES.includes(name)) {
    return { ok: false, error: `Invalid profile "${name}". Valid: ${VALID_PROFILE_NAMES.join(', ')}` };
  }
  activeProfile = name;
  return { ok: true };
}

/**
 * Reset to default (useful in tests).
 */
export function resetProfile() {
  activeProfile = 'balanced';
}
