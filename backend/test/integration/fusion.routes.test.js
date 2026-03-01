// ── Integration tests: Fusion governance routes ─────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { evaluateFusion } from '../../src/fusion/fusionEvaluator.js';
import {
  getActiveProfile,
  setActiveProfile,
  resetProfile,
  VALID_PROFILE_NAMES,
} from '../../src/fusion/policyProfiles.js';
import { validateFusionInput, validateProfileInput } from '../../src/fusion/schema.js';

// ── Lightweight app builder (mirrors relevant routes from index.js) ─────────

function buildApp() {
  const app = express();
  app.use(express.json());

  function errBody(error, context) {
    const body = { ok: false, error: String(error), ts: new Date().toISOString() };
    if (context !== undefined) body.context = String(context);
    return body;
  }

  app.get('/api/governance/fusion/config', (_req, res) => {
    const profile = getActiveProfile();
    return res.json({
      ok: true,
      profile: profile.name,
      details: profile,
      valid_profiles: VALID_PROFILE_NAMES,
      ts: new Date().toISOString(),
    });
  });

  app.post('/api/governance/fusion/config', (req, res) => {
    const validationError = validateProfileInput(req.body);
    if (validationError) {
      return res.status(400).json(errBody(validationError, 'input validation'));
    }
    const result = setActiveProfile(req.body.profile);
    if (!result.ok) {
      return res.status(400).json(errBody(result.error, 'profile switch'));
    }
    const profile = getActiveProfile();
    return res.json({
      ok: true,
      profile: profile.name,
      details: profile,
      ts: new Date().toISOString(),
    });
  });

  app.post('/api/governance/fusion/evaluate', (req, res) => {
    const validationError = validateFusionInput(req.body);
    if (validationError) {
      return res.status(400).json(errBody(validationError, 'input validation'));
    }
    const result = evaluateFusion(req.body);
    return res.json({ ok: true, ...result });
  });

  return app;
}

// ── Tiny supertest-like helper (avoids extra dependency) ─────────────────────

function request(app) {
  return {
    async get(path) {
      return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
          const port = server.address().port;
          fetch(`http://127.0.0.1:${port}${path}`)
            .then(async (r) => {
              const body = await r.json();
              server.close();
              resolve({ status: r.status, body });
            })
            .catch((e) => { server.close(); reject(e); });
        });
      });
    },
    async post(path, data) {
      return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
          const port = server.address().port;
          fetch(`http://127.0.0.1:${port}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
            .then(async (r) => {
              const body = await r.json();
              server.close();
              resolve({ status: r.status, body });
            })
            .catch((e) => { server.close(); reject(e); });
        });
      });
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Fusion governance routes', () => {
  let app;
  beforeEach(() => {
    resetProfile();
    app = buildApp();
  });

  // ── GET /api/governance/fusion/config ──────────────────────────────────────

  describe('GET /api/governance/fusion/config', () => {
    it('returns active profile (default = balanced)', async () => {
      const { status, body } = await request(app).get('/api/governance/fusion/config');
      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.profile).toBe('balanced');
      expect(body.valid_profiles).toEqual(expect.arrayContaining(['strict', 'balanced', 'permissive']));
    });
  });

  // ── POST /api/governance/fusion/config ─────────────────────────────────────

  describe('POST /api/governance/fusion/config', () => {
    it('switches to strict', async () => {
      const { status, body } = await request(app).post('/api/governance/fusion/config', { profile: 'strict' });
      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.profile).toBe('strict');
    });

    it('switches to permissive', async () => {
      const { status, body } = await request(app).post('/api/governance/fusion/config', { profile: 'permissive' });
      expect(status).toBe(200);
      expect(body.profile).toBe('permissive');
    });

    it('rejects invalid profile with 400', async () => {
      const { status, body } = await request(app).post('/api/governance/fusion/config', { profile: 'yolo' });
      expect(status).toBe(400);
      expect(body.ok).toBe(false);
      expect(body.error).toMatch(/invalid profile/i);
    });

    it('rejects missing profile field with 400', async () => {
      const { status, body } = await request(app).post('/api/governance/fusion/config', {});
      expect(status).toBe(400);
      expect(body.ok).toBe(false);
    });

    it('updates profile immediately (GET reflects change)', async () => {
      await request(app).post('/api/governance/fusion/config', { profile: 'strict' });
      const { body } = await request(app).get('/api/governance/fusion/config');
      expect(body.profile).toBe('strict');
    });
  });

  // ── POST /api/governance/fusion/evaluate ───────────────────────────────────

  describe('POST /api/governance/fusion/evaluate', () => {
    it('includes policy_profile in response', async () => {
      const { body } = await request(app).post('/api/governance/fusion/evaluate', { risk_score: 0.5 });
      expect(body.ok).toBe(true);
      expect(body.policy_profile).toBe('balanced');
    });

    it('balanced: low risk_score → allow', async () => {
      const { body } = await request(app).post('/api/governance/fusion/evaluate', { risk_score: 0.1 });
      expect(body.decision).toBe('allow');
    });

    it('balanced: mid risk_score → review', async () => {
      const { body } = await request(app).post('/api/governance/fusion/evaluate', { risk_score: 0.5 });
      expect(body.decision).toBe('review');
    });

    it('balanced: high risk_score → block', async () => {
      const { body } = await request(app).post('/api/governance/fusion/evaluate', { risk_score: 0.9 });
      expect(body.decision).toBe('block');
    });

    it('strict increases review/block tendency', async () => {
      await request(app).post('/api/governance/fusion/config', { profile: 'strict' });
      // 0.30 is allow under balanced (threshold 0.40) but review under strict (threshold 0.25)
      const { body } = await request(app).post('/api/governance/fusion/evaluate', { risk_score: 0.30 });
      expect(body.decision).toBe('review');
      expect(body.policy_profile).toBe('strict');
    });

    it('permissive lowers unnecessary review', async () => {
      await request(app).post('/api/governance/fusion/config', { profile: 'permissive' });
      // 0.50 is review under balanced (threshold 0.40) but allow under permissive (threshold 0.55)
      const { body } = await request(app).post('/api/governance/fusion/evaluate', { risk_score: 0.50 });
      expect(body.decision).toBe('allow');
      expect(body.policy_profile).toBe('permissive');
    });

    it('rejects invalid risk_score', async () => {
      const { status, body } = await request(app).post('/api/governance/fusion/evaluate', { risk_score: 2 });
      expect(status).toBe(400);
      expect(body.ok).toBe(false);
    });
  });
});
