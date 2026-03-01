// ── Unit & observability tests: fusionEvaluator + policyProfiles ─────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateFusion } from '../../src/fusion/fusionEvaluator.js';
import {
  getActiveProfile,
  getActiveProfileName,
  setActiveProfile,
  resetProfile,
  PROFILES,
  VALID_PROFILE_NAMES,
} from '../../src/fusion/policyProfiles.js';
import { validateFusionInput, validateProfileInput } from '../../src/fusion/schema.js';

// ── policyProfiles ───────────────────────────────────────────────────────────

describe('policyProfiles', () => {
  beforeEach(() => resetProfile());

  it('default profile is balanced', () => {
    expect(getActiveProfileName()).toBe('balanced');
  });

  it('getActiveProfile returns full profile object', () => {
    const p = getActiveProfile();
    expect(p.name).toBe('balanced');
    expect(p.decision_thresholds).toBeDefined();
    expect(p.uncertainty_guard_sensitivity).toBe(1.0);
    expect(p.stale_handling).toBe('review');
  });

  it('setActiveProfile switches profile', () => {
    const r = setActiveProfile('strict');
    expect(r.ok).toBe(true);
    expect(getActiveProfileName()).toBe('strict');
  });

  it('setActiveProfile rejects invalid name', () => {
    const r = setActiveProfile('nonexistent');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/invalid profile/i);
    expect(getActiveProfileName()).toBe('balanced'); // unchanged
  });

  it('resetProfile restores balanced', () => {
    setActiveProfile('permissive');
    resetProfile();
    expect(getActiveProfileName()).toBe('balanced');
  });

  it('VALID_PROFILE_NAMES contains all three profiles', () => {
    expect(VALID_PROFILE_NAMES).toEqual(['strict', 'balanced', 'permissive']);
  });
});

// ── fusionEvaluator ──────────────────────────────────────────────────────────

describe('evaluateFusion', () => {
  beforeEach(() => resetProfile());

  // ── Threshold-based decisions (balanced) ─────────────────────────

  it('allow when risk_score < allow_below', () => {
    const r = evaluateFusion({ risk_score: 0.1 });
    expect(r.decision).toBe('allow');
    expect(r.policy_profile).toBe('balanced');
  });

  it('review when risk_score is between thresholds', () => {
    const r = evaluateFusion({ risk_score: 0.5 });
    expect(r.decision).toBe('review');
  });

  it('block when risk_score > block_above', () => {
    const r = evaluateFusion({ risk_score: 0.9 });
    expect(r.decision).toBe('block');
  });

  // ── Stale handling per profile ──────────────────────────────────

  it('balanced: stale → review', () => {
    const r = evaluateFusion({ risk_score: 0.1, stale: true });
    expect(r.decision).toBe('review');
    expect(r.guard_triggered).toBe('stale_review');
  });

  it('strict: stale → block', () => {
    setActiveProfile('strict');
    const r = evaluateFusion({ risk_score: 0.1, stale: true });
    expect(r.decision).toBe('block');
    expect(r.guard_triggered).toBe('stale_reject');
  });

  it('permissive: stale → falls through to score', () => {
    setActiveProfile('permissive');
    const r = evaluateFusion({ risk_score: 0.1, stale: true });
    expect(r.decision).toBe('allow');
    expect(r.guard_triggered).toBeUndefined();
  });

  // ── Uncertainty guard ──────────────────────────────────────────

  it('high uncertainty triggers review (balanced)', () => {
    const r = evaluateFusion({ risk_score: 0.1, uncertainty: 0.6 });
    expect(r.decision).toBe('review');
    expect(r.guard_triggered).toBe('uncertainty');
  });

  it('strict: lower uncertainty still triggers guard (higher sensitivity)', () => {
    setActiveProfile('strict');
    // uncertainty 0.4 * sensitivity 1.5 = 0.6 > 0.5 → guard
    const r = evaluateFusion({ risk_score: 0.1, uncertainty: 0.4 });
    expect(r.decision).toBe('review');
    expect(r.guard_triggered).toBe('uncertainty');
  });

  it('permissive: same uncertainty does NOT trigger guard (lower sensitivity)', () => {
    setActiveProfile('permissive');
    // uncertainty 0.6 * sensitivity 0.5 = 0.3 ≤ 0.5 → no guard
    const r = evaluateFusion({ risk_score: 0.1, uncertainty: 0.6 });
    expect(r.decision).toBe('allow');
    expect(r.guard_triggered).toBeUndefined();
  });

  // ── Profile switching affects thresholds ────────────────────────

  it('strict: 0.30 → review (balanced would allow)', () => {
    setActiveProfile('strict');
    const r = evaluateFusion({ risk_score: 0.30 });
    expect(r.decision).toBe('review');
    expect(r.thresholds_applied.allow_below).toBe(0.25);
  });

  it('permissive: 0.50 → allow (balanced would review)', () => {
    setActiveProfile('permissive');
    const r = evaluateFusion({ risk_score: 0.50 });
    expect(r.decision).toBe('allow');
    expect(r.thresholds_applied.allow_below).toBe(0.55);
  });

  // ── Metadata pass-through ──────────────────────────────────────

  it('passes metadata through if provided', () => {
    const r = evaluateFusion({ risk_score: 0.1, metadata: { txn_id: 'abc' } });
    expect(r.metadata).toEqual({ txn_id: 'abc' });
  });

  it('omits metadata key if not provided', () => {
    const r = evaluateFusion({ risk_score: 0.1 });
    expect(r.metadata).toBeUndefined();
  });
});

// ── schema validation ─────────────────────────────────────────────────────────

describe('schema validation', () => {
  describe('validateFusionInput', () => {
    it('accepts valid minimal input', () => {
      expect(validateFusionInput({ risk_score: 0.5 })).toBeNull();
    });

    it('accepts valid full input', () => {
      expect(validateFusionInput({ risk_score: 0.5, uncertainty: 0.3, stale: false })).toBeNull();
    });

    it('rejects missing risk_score', () => {
      expect(validateFusionInput({})).toMatch(/risk_score/);
    });

    it('rejects out-of-range risk_score', () => {
      expect(validateFusionInput({ risk_score: 1.5 })).toMatch(/between 0 and 1/);
    });

    it('rejects non-boolean stale', () => {
      expect(validateFusionInput({ risk_score: 0.5, stale: 'yes' })).toMatch(/boolean/);
    });
  });

  describe('validateProfileInput', () => {
    it('accepts valid profile', () => {
      expect(validateProfileInput({ profile: 'strict' })).toBeNull();
    });

    it('rejects missing profile', () => {
      expect(validateProfileInput({})).toMatch(/profile/);
    });
  });
});
