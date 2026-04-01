/**
 * sessionStorage utility for persisting user data across page refreshes.
 * Single key `tpp_employer_session` stores all collected data.
 */

const SESSION_KEY = 'tpp_employer_session';

const DEFAULTS = {
  step: 0,
  zip: '',
  county: '',
  countyName: '',
  state: '',
  availableCounties: [],
  doctors: [],
  prescriptions: [],
  medicaid: null,
  csnpConditions: [],
  priorities: [],
  plan_types: [],
  current_plan: null,
  answers: {},
  selectedPayer: null,
  maNeeds: {},
  mgNeeds: {},
  recommendationData: null,
  planResult: null,
  matchedPlan: null,
};

/**
 * Load session from sessionStorage, returning defaults for any missing fields.
 * @returns {Object} Merged session data
 */
export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch (err) {
    console.warn('Failed to load session from sessionStorage:', err);
    return { ...DEFAULTS };
  }
}

/**
 * Merge partial data into the existing stored session.
 * @param {Object} partialData - Fields to merge
 */
export function saveSession(partialData) {
  try {
    const current = loadSession();
    const merged = { ...current, ...partialData };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save session to sessionStorage:', err);
  }
}

/**
 * Remove the session key entirely.
 */
export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.warn('Failed to clear session from sessionStorage:', err);
  }
}
