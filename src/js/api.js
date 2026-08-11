/**
 * BAATMEEDAR — API Layer
 * 
 * Direct API calls to the real backend verification engine.
 * No hardcoded or mock data.
 */

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);

const DEFAULT_BACKEND_URL = isLocal
  ? 'http://localhost:10000'
  : 'https://baatmeedar.onrender.com';

export const BASE_URL = window.LOCATION_BACKEND_URL || window.__ENV__?.BACKEND_URL || DEFAULT_BACKEND_URL;

/**
 * Trigger an early ping to wake Render cold instance in the background
 */
export async function warmUpBackend() {
  try {
    fetch(`${BASE_URL}/health/live`, { method: 'GET', mode: 'cors' }).catch(() => {});
  } catch {}
}

let guestSessionId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('baatmeedar_guest_id') : null;

function updateGuestSessionId(res) {
  if (!res || !res.headers) return;
  const headerId = res.headers.get('x-guest-session-id');
  if (headerId) {
    guestSessionId = headerId;
    try {
      sessionStorage.setItem('baatmeedar_guest_id', headerId);
    } catch {}
  }
}

async function _apiPost(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 120s for Render cold start
  const headers = { 'Content-Type': 'application/json' };
  if (guestSessionId) {
    headers['x-guest-session-id'] = guestSessionId;
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    updateGuestSessionId(res);
    clearTimeout(timeout);
    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const data = await res.json();
        if (data.error) errorMsg = data.error;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = `${errorMsg}: ${text.slice(0, 150)}`;
      }
      throw new Error(errorMsg);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server may be waking up from sleep — please try again in a few seconds.');
    }
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error('Backend connection failed. Please ensure the Render backend is live and CORS is configured.');
    }
    throw err;
  }
}

async function _apiGet(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  const headers = {};
  if (guestSessionId) {
    headers['x-guest-session-id'] = guestSessionId;
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    updateGuestSessionId(res);
    clearTimeout(timeout);
    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const data = await res.json();
        if (data.error) errorMsg = data.error;
      } catch {}
      throw new Error(errorMsg);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Status check timed out.');
    throw err;
  }
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC API — Real Backend Pipeline
   ───────────────────────────────────────────────────────────── */

/**
 * Submit a verification request to the backend.
 * @param {'text'|'article'|'youtube'} inputType
 * @param {string} content
 * @returns {Promise<{run_id: string}>}
 */
export async function submitVerification(inputType, content) {
  return _apiPost('/verify', { input_type: inputType, content });
}

/**
 * Poll for run status.
 * @param {string} runId
 * @returns {Promise<{status: string, stage: string, partial?: object}>}
 */
export async function getStatus(runId) {
  return _apiGet(`/verify/${runId}/status`);
}

/**
 * Fetch full results once complete.
 * @param {string} runId
 * @returns {Promise<object>} Full results object
 */
export async function getResults(runId) {
  return _apiGet(`/verify/${runId}/results`);
}
