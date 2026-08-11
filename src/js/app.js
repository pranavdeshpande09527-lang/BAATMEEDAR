/**
 * BAATMEEDAR — App Orchestrator
 *
 * Manages application state, polling loop, and wires together
 * the API layer with the render functions.
 */

import { submitVerification, getStatus, getResults, warmUpBackend } from './api.js?v=20260811d';
import { renderStage1, renderStage2, renderStage3, renderVerdict } from './renderers.js?v=20260811d';

/* ─────────────────────────────────────────────────────────────
   State
   ───────────────────────────────────────────────────────────── */
const State = {
  runId:         null,
  pollTimer:     null,
  pollCount:     0,
  MAX_POLLS:     200,   // 200 × 3s = 10 minutes max
  POLL_INTERVAL: 3000,  // ms
};

/* ─────────────────────────────────────────────────────────────
   DOM refs — resolved once on DOMContentLoaded
   ───────────────────────────────────────────────────────────── */
let dom = {};

function resolveDom() {
  dom = {
    // Input
    tabs:           document.querySelectorAll('.input-tab'),
    textField:      document.getElementById('field-text'),
    urlField:       document.getElementById('field-url'),
    textarea:       document.getElementById('input-textarea'),
    urlInput:       document.getElementById('input-url'),
    charCount:      document.getElementById('char-count'),
    submitBtn:      document.getElementById('btn-submit'),
    inputError:     document.getElementById('input-error'),
    inputHint:      document.getElementById('input-hint'),

    // Results area
    resultsArea:    document.getElementById('results-area'),
    progressSect:   document.getElementById('progress-section'),
    wakeupNotice:   document.getElementById('wakeup-notice'),

    // Progress steps
    stepInput:      document.getElementById('step-input'),
    stepExtract:    document.getElementById('step-extract'),
    stepResearch:   document.getElementById('step-research'),
    stepVerify:     document.getElementById('step-verify'),
    stepDone:       document.getElementById('step-done'),

    // Stage containers
    stage1Wrap:     document.getElementById('stage1-wrap'),
    stage2Wrap:     document.getElementById('stage2-wrap'),
    stage3Wrap:     document.getElementById('stage3-wrap'),
    verdictWrap:    document.getElementById('verdict-wrap'),

    // Error display
    globalError:    document.getElementById('global-error'),
  };
}

/* ─────────────────────────────────────────────────────────────
   Input Tab Switching
   ───────────────────────────────────────────────────────────── */
function initTabs() {
  dom.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const type = tab.dataset.type;
      if (type === 'text') {
        dom.textField.classList.remove('hidden');
        dom.urlField.classList.add('hidden');
        dom.inputHint.textContent = 'Paste or type a factual statement. Maximum 5,000 characters.';
      } else {
        dom.textField.classList.add('hidden');
        dom.urlField.classList.remove('hidden');
        dom.inputHint.textContent = type === 'article'
          ? 'Paste a full article URL. Must be publicly accessible (e.g. https://reuters.com/...).'
          : 'Paste a YouTube video URL. Must have an available transcript.';
      }
      clearInputError();
    });
  });

  // Char counter
  dom.textarea.addEventListener('input', () => {
    const len = dom.textarea.value.length;
    const max = 5000;
    dom.charCount.textContent = `${len} / ${max}`;
    dom.charCount.classList.toggle('over', len > max);
  });
}

/* ─────────────────────────────────────────────────────────────
   Validation
   ───────────────────────────────────────────────────────────── */
function getActiveType() {
  return document.querySelector('.input-tab.active')?.dataset?.type || 'text';
}

function getInputValue() {
  const type = getActiveType();
  return type === 'text'
    ? dom.textarea.value.trim()
    : dom.urlInput.value.trim();
}

function validate() {
  const type  = getActiveType();
  const value = getInputValue();

  if (!value) {
    showInputError('Please enter a ' + (type === 'text' ? 'statement' : 'URL') + ' before submitting.');
    return false;
  }

  if (type === 'text' && value.length > 5000) {
    showInputError('Statement exceeds 5,000 character limit. Please shorten it.');
    return false;
  }

  if ((type === 'article' || type === 'youtube') && !isValidUrl(value)) {
    showInputError('Please enter a valid URL starting with https://');
    return false;
  }

  if (type === 'youtube' && !isYoutubeUrl(value)) {
    showInputError('Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...)');
    return false;
  }

  return true;
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
}

function isYoutubeUrl(str) {
  try {
    const u = new URL(str);
    return u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com' || u.hostname === 'youtu.be';
  } catch { return false; }
}

function showInputError(msg) {
  dom.inputError.textContent = msg;
  dom.inputError.classList.add('visible');
  dom.inputError.setAttribute('role', 'alert');
}

function clearInputError() {
  dom.inputError.classList.remove('visible');
  dom.inputError.textContent = '';
}

/* ─────────────────────────────────────────────────────────────
   Submit Handler
   ───────────────────────────────────────────────────────────── */
async function handleSubmit(e) {
  e.preventDefault();
  clearInputError();

  if (!validate()) return;

  const type    = getActiveType();
  const content = getInputValue();

  setSubmitLoading(true);

  // Show results area, hide input section content
  dom.resultsArea.classList.remove('hidden');
  dom.progressSect.classList.remove('hidden');
  document.getElementById('input-section').scrollIntoView({ behavior: 'smooth' });

  // Show wakeup notice after 5 seconds if still waiting
  const wakeupTimer = setTimeout(() => {
    dom.wakeupNotice.classList.remove('hidden');
  }, 5000);

  try {
    const { run_id } = await submitVerification(type, content);
    State.runId = run_id;
    clearTimeout(wakeupTimer);
    dom.wakeupNotice.classList.add('hidden');
    setSubmitLoading(false);
    markStepDone('step-input');
    startPolling();
  } catch (err) {
    clearTimeout(wakeupTimer);
    dom.wakeupNotice.classList.add('hidden');
    setSubmitLoading(false);
    showGlobalError('Submission failed: ' + err.message);
  }
}

function setSubmitLoading(loading) {
  dom.submitBtn.disabled = loading;
  dom.submitBtn.textContent = loading ? 'SUBMITTING...' : 'VERIFY CLAIM →';
}

/* ─────────────────────────────────────────────────────────────
   Polling Loop
   ───────────────────────────────────────────────────────────── */
function startPolling() {
  State.pollCount = 0;
  poll();
}

async function poll() {
  if (State.pollCount >= State.MAX_POLLS) {
    showGlobalError('Verification is taking longer than expected. Please try again.');
    return;
  }

  try {
    const { status, stage } = await getStatus(State.runId);
    State.pollCount++;
    updateProgress(stage);

    if (status === 'complete') {
      await fetchAndRender();
      return;
    }

    if (status === 'failed' || status === 'error') {
      showGlobalError('Verification failed on the server. Please try again.');
      return;
    }

    // Schedule next poll
    State.pollTimer = setTimeout(poll, State.POLL_INTERVAL);

  } catch (err) {
    // Network hiccup — retry a few times before giving up
    if (State.pollCount < 5) {
      State.pollCount++;
      State.pollTimer = setTimeout(poll, State.POLL_INTERVAL * 2);
    } else {
      showGlobalError('Lost connection to server: ' + err.message);
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   Progress Tracker Updates
   ───────────────────────────────────────────────────────────── */
const STAGE_ORDER = ['input_received', 'extracting_claims', 'researching', 'verifying', 'complete'];
const STAGE_STEP_MAP = {
  'input_received':    'step-input',
  'extracting_claims': 'step-extract',
  'researching':       'step-research',
  'verifying':         'step-verify',
  'complete':          'step-done',
};

function updateProgress(currentStage) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  STAGE_ORDER.forEach((stage, i) => {
    const stepId = STAGE_STEP_MAP[stage];
    const el     = document.getElementById(stepId);
    if (!el) return;

    el.classList.remove('done', 'active', 'error');

    if (i < currentIdx) {
      el.classList.add('done');
      el.querySelector('.step-mark').textContent = '[✓]';
    } else if (i === currentIdx) {
      el.classList.add('active');
      el.querySelector('.step-mark').textContent = '[·]';
      el.querySelector('.step-mark').classList.add('blink');
    } else {
      el.querySelector('.step-mark').textContent = '[ ]';
      el.querySelector('.step-mark').classList.remove('blink');
    }
  });
}

function markStepDone(stepId) {
  const el = document.getElementById(stepId);
  if (!el) return;
  el.classList.add('done');
  el.querySelector('.step-mark').textContent = '[✓]';
}

/* ─────────────────────────────────────────────────────────────
   Fetch Full Results & Render All Stages
   ───────────────────────────────────────────────────────────── */
async function fetchAndRender() {
  try {
    const data = await getResults(State.runId);

    // Mark all steps done
    STAGE_ORDER.forEach(s => markStepDone(STAGE_STEP_MAP[s]));

    // Render Stage 1
    if (data.input) {
      dom.stage1Wrap.innerHTML = renderStage1(data.input);
      dom.stage1Wrap.classList.remove('hidden');
    }

    // Render Stage 2
    if (data.claims) {
      dom.stage2Wrap.innerHTML = renderStage2(data.claims, data.removed_opinions);
      dom.stage2Wrap.classList.remove('hidden');
    }

    // Render Stage 3
    if (data.research) {
      dom.stage3Wrap.innerHTML = renderStage3(data.research, data.claims || []);
      dom.stage3Wrap.classList.remove('hidden');
    }

    // Render Final Verdict
    if (data.verdicts) {
      dom.verdictWrap.innerHTML = renderVerdict(data.verdicts, data.claims || []);
      dom.verdictWrap.classList.remove('hidden');
    }

    // Scroll to results
    setTimeout(() => {
      dom.stage1Wrap.scrollIntoView({ behavior: 'smooth' });
    }, 100);

  } catch (err) {
    showGlobalError('Failed to load results: ' + err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   Error Display
   ───────────────────────────────────────────────────────────── */
function showGlobalError(msg) {
  dom.globalError.innerHTML = `
    <div class="error-box">
      <strong>ERROR</strong> — ${escHtml(msg)}
    </div>`;
  dom.globalError.classList.remove('hidden');
  dom.globalError.scrollIntoView({ behavior: 'smooth' });
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────────────────────────
   Reset / New Verification
   ───────────────────────────────────────────────────────────── */
function reset() {
  clearTimeout(State.pollTimer);
  State.runId = null;
  State.pollCount = 0;

  // Clear results
  dom.stage1Wrap.innerHTML   = '';
  dom.stage2Wrap.innerHTML   = '';
  dom.stage3Wrap.innerHTML   = '';
  dom.verdictWrap.innerHTML  = '';
  dom.globalError.innerHTML  = '';

  dom.stage1Wrap.classList.add('hidden');
  dom.stage2Wrap.classList.add('hidden');
  dom.stage3Wrap.classList.add('hidden');
  dom.verdictWrap.classList.add('hidden');
  dom.globalError.classList.add('hidden');
  dom.progressSect.classList.add('hidden');
  dom.wakeupNotice.classList.add('hidden');
  dom.resultsArea.classList.add('hidden');

  // Reset input
  dom.textarea.value  = '';
  dom.urlInput.value  = '';
  dom.charCount.textContent = '0 / 5000';
  setSubmitLoading(false);
  clearInputError();

  // Scroll back to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  dom.textarea.focus();
}

/* ─────────────────────────────────────────────────────────────
   Toggle raw text expand
   ───────────────────────────────────────────────────────────── */
window.toggleRawText = function(btn) {
  const preview = document.getElementById('raw-text-preview');
  const expanded = preview.classList.toggle('expanded');
  btn.textContent = expanded ? 'SHOW LESS ↑' : 'SHOW FULL TEXT ↓';
  btn.setAttribute('aria-expanded', expanded);
};

/* ─────────────────────────────────────────────────────────────
   Expose reset globally (called from render buttons)
   ───────────────────────────────────────────────────────────── */
window.BAATMEEDAR = { reset };

/* ─────────────────────────────────────────────────────────────
   Init
   ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  resolveDom();
  initTabs();
  warmUpBackend();

  // Set current date in dateline
  const dl = document.getElementById('dateline-date');
  if (dl) {
    dl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).toUpperCase();
  }

  document.getElementById('verify-form').addEventListener('submit', handleSubmit);
});
