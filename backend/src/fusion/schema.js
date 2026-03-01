// ── Fusion input validation schema ───────────────────────────────────────────

/**
 * Validate fusion evaluation input.
 * @param {Object} body
 * @returns {string|null} Error message, or null if valid.
 */
export function validateFusionInput(body) {
  if (!body || typeof body !== 'object') return 'Request body must be a JSON object.';

  const { risk_score } = body;
  if (risk_score === undefined || risk_score === null)
    return '"risk_score" is required.';
  if (typeof risk_score !== 'number' || !isFinite(risk_score))
    return '"risk_score" must be a finite number.';
  if (risk_score < 0 || risk_score > 1)
    return '"risk_score" must be between 0 and 1.';

  if (body.uncertainty !== undefined) {
    if (typeof body.uncertainty !== 'number' || !isFinite(body.uncertainty))
      return '"uncertainty" must be a finite number.';
    if (body.uncertainty < 0 || body.uncertainty > 1)
      return '"uncertainty" must be between 0 and 1.';
  }

  if (body.stale !== undefined && typeof body.stale !== 'boolean')
    return '"stale" must be a boolean.';

  return null;
}

/**
 * Validate profile switch input.
 * @param {Object} body
 * @returns {string|null} Error message, or null if valid.
 */
export function validateProfileInput(body) {
  if (!body || typeof body !== 'object') return 'Request body must be a JSON object.';
  if (!body.profile || typeof body.profile !== 'string')
    return '"profile" field is required and must be a string.';
  return null;
}
