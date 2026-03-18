/**
 * Sunfire Service - Unified service for Sunfire API operations
 * Handles Medicare sessions, plans, drugs, providers, and ZIP lookups
 */

import axios from 'axios';
import { sunfireApi, handleApiError } from '../lib/axios';

// ============================================
// ZIP Lookup Functions
// ============================================

/**
 * Look up ZIP code information including counties and states
 * @param {string} zipCode - ZIP code to look up
 * @returns {Promise<Object>} ZIP lookup response
 */
export const lookupZip = async (zipCode) => {
  try {
    const response = await sunfireApi.get(`/sunfire/zip/${zipCode}`);
    return response.data;
  } catch (error) {
    console.error('ZIP lookup failed:', error.message);
    throw new Error(`Could not look up ZIP code "${zipCode}". Please try again.`);
  }
};

// ============================================
// Provider Search Functions
// ============================================

/**
 * Search for healthcare providers
 * @param {Object} request - Provider search request
 * @param {string} request.provider_name - Provider name to search
 * @param {string} request.zip_code - ZIP code for search
 * @param {number} [request.max_size] - Maximum number of results
 * @returns {Promise<Array>} Provider search results
 */
export const searchProviders = async (request) => {
  try {
    const response = await sunfireApi.post('/sunfire/providers/search', request);
    return response.data;
  } catch (error) {
    console.error('Provider search failed:', error.message);
    throw new Error('Provider search failed. Please try again.');
  }
};

/**
 * Search for healthcare providers by full name
 * @param {Object} request - Provider search request
 * @returns {Promise<Array>} Provider search results
 */
export const searchProvidersByFullName = async (request) => {
  try {
    const response = await sunfireApi.post('/sunfire/providers/search/fullname', request);
    return response.data;
  } catch (error) {
    console.error('Provider fullname search failed:', error.message);
    throw new Error('Provider search failed. Please try again.');
  }
};

// ============================================
// Session Management Functions
// ============================================

/**
 * Create or save a new session
 * @param {Object} session - Session model
 * @returns {Promise<Object>} Saved session
 */
export const saveSession = async (session) => {
  try {
    const response = await sunfireApi.post('/sunfire/session', session);
    return response.data;
  } catch (error) {
    console.error('Save session failed:', error.message);
    throw new Error('Failed to save session. Please try again.');
  }
};

/**
 * Get an existing session by customer code
 * @param {string} customerCode - Customer code
 * @param {boolean} [byExternalId] - Whether to search by external ID
 * @returns {Promise<Object>} Session model
 */
export const getSession = async (customerCode, byExternalId = false) => {
  try {
    const params = byExternalId ? { byExternalId: true } : {};
    const response = await sunfireApi.get(`/sunfire/session/${customerCode}`, { params });
    return response.data;
  } catch (error) {
    console.error('Get session failed:', error.message);
    throw new Error('Failed to retrieve session. Please try again.');
  }
};

/**
 * Update an existing session using PATCH operations
 * @param {Object} patch - Session patch model
 * @returns {Promise<Object>} Updated session
 */
export const patchSession = async (patch) => {
  try {
    const response = await sunfireApi.patch('/sunfire/session', patch);
    return response.data;
  } catch (error) {
    console.error('Patch session failed:', error.message);
    throw new Error('Failed to update session. Please try again.');
  }
};

/**
 * Update/replace an entire session
 * @param {string} customerCode - Customer code
 * @param {Object} session - Session model
 * @returns {Promise<Object>} Updated session
 */
export const putSession = async (customerCode, session) => {
  try {
    const response = await sunfireApi.put(`/sunfire/session/${customerCode}`, session);
    return response.data;
  } catch (error) {
    console.error('Put session failed:', error.message);
    throw new Error('Failed to update session. Please try again.');
  }
};

// ============================================
// Drug Search Functions
// ============================================

/**
 * Search for drugs by partial name
 * @param {string} letters - Letters to search
 * @param {boolean} [fuzzy=false] - Whether to use fuzzy search
 * @returns {Promise<Object>} Drug list model
 */
export const searchDrugs = async (letters, fuzzy = false) => {
  try {
    const response = await sunfireApi.get(`/sunfire/drug/drugs/${letters}/${fuzzy}`);
    return response.data;
  } catch (error) {
    console.error('Drug search failed:', error.message);
    throw new Error('Drug search failed. Please try again.');
  }
};

/**
 * Search drugs via RxNorm + Sunfire verification (backend endpoint).
 * Always resolves generic names and validates against Sunfire.
 * Supports brand names, generic names, and partial names.
 * Falls back to plain Sunfire search if backend/RxNorm is unavailable.
 * @param {string} query - Drug name to search (brand, generic, or partial)
 * @returns {Promise<{drugs: Array}>}
 */
export const searchDrugsWithGenericFallback = async (query) => {
  try {
    const response = await sunfireApi.get(`/sunfire/drug/generic/${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.warn('RxNorm drug search failed, falling back to Sunfire:', error.message);
    const searchPrefix = query.length >= 3 ? query.substring(0, 3) : query;
    return await searchDrugs(searchPrefix, true);
  }
};

/**
 * Get dosage information for a specific drug
 * @param {number} drugNameId - Drug name ID
 * @returns {Promise<Object>} Drug dosage list model
 */
export const getDrugDosages = async (drugNameId) => {
  try {
    const response = await sunfireApi.get(`/sunfire/drug/dosage/${drugNameId}`);
    return response.data;
  } catch (error) {
    console.error('Drug dosage lookup failed:', error.message);
    throw new Error('Failed to get drug dosage information. Please try again.');
  }
};

// ============================================
// Plan Search Functions
// ============================================

/**
 * Calculate/search plans based on session data
 * @param {Object} session - Session model
 * @returns {Promise<Object>} Plan search response
 */
export const calculatePlans = async (session) => {
  try {
    const response = await sunfireApi.post('/sunfire/plans', session);
    return response.data;
  } catch (error) {
    console.error('Calculate plans failed:', error.message);
    throw new Error('Failed to calculate plans. Please try again.');
  }
};

/**
 * Get plans by customer profile
 * @param {string} customerCode - Customer code
 * @param {string} year - Plan year
 * @returns {Promise<Object>} Plan search response
 */
export const getPlansByProfile = async (customerCode, year) => {
  try {
    const response = await sunfireApi.get(`/sunfire/plans/profile/${customerCode}/${year}`);
    return response.data;
  } catch (error) {
    console.error('Get plans by profile failed:', error.message);
    throw new Error('Failed to get plans. Please try again.');
  }
};

/**
 * Get recommended plans for a customer session
 * @param {string} customerCode - Customer code
 * @param {string} year - Plan year
 * @param {Object} [options] - Options
 * @returns {Promise<Object>} Recommendations
 */
export const getPlanRecommendations = async (customerCode, year, options = {}) => {
  try {
    const response = await sunfireApi.get(
      `/sunfire/plans/recommendations/${customerCode}/${year}`,
      { params: options }
    );
    return response.data;
  } catch (error) {
    console.error('Get plan recommendations failed:', error.message);
    throw new Error('Failed to get plan recommendations. Please try again.');
  }
};

/**
 * Get V6 plan recommendations with enhanced comparison data
 * @param {string} customerCode - Customer code
 * @param {string} year - Plan year
 * @param {Object} payload - V6 recommendation payload
 * @param {Object} [payload.medicaid_payload] - Medicaid-specific data
 * @param {boolean} [payload.allow_dsnp] - Allow Dual Special Needs Plans
 * @param {boolean} [payload.allow_csnp] - Allow Chronic Special Needs Plans
 * @param {string} [payload.doctor_visits_per_year] - Estimated doctor visits per year
 * @param {string} [payload.dental_needs] - Dental needs ('yes' | 'maybe' | 'no')
 * @param {boolean} [payload.has_second_home] - Whether user has a second home
 * @returns {Promise<Object>} V6 Recommendations with comparison data
 */
export const getRecommendationsV6 = async (customerCode, year, payload = {}) => {
  try {
    const requestPayload = {
      medicaid_payload: payload.medicaid_payload || {},
      allow_dsnp: payload.allow_dsnp ?? true,
      allow_csnp: payload.allow_csnp ?? false,
      ...(payload.doctor_visits_per_year && { doctor_visits_per_year: payload.doctor_visits_per_year }),
      ...(payload.dental_needs && { dental_needs: payload.dental_needs }),
      ...(payload.has_second_home !== undefined && { has_second_home: payload.has_second_home }),
      ...(payload.is_ma_only !== undefined && { is_ma_only: payload.is_ma_only })
    };

    const response = await sunfireApi.post(
      `/sunfire/plans/recommendations/v6/${customerCode}/${year}`,
      requestPayload
    );
    return response.data;
  } catch (error) {
    console.error('Get V6 plan recommendations failed:', error.message);
    throw new Error('Failed to get plan recommendations. Please try again.');
  }
};

/**
 * Get list of available plans for a location
 * @param {string} year - Plan year
 * @param {string} zip - ZIP code
 * @param {string} county - County
 * @returns {Promise<Array>} List of plans
 */
export const getPlansList = async (year, zip, county) => {
  try {
    const response = await sunfireApi.get(`/sunfire/plans/list/${year}/${zip}/${county}`);

    // The API returns a PlanSearchResponse object with a plans array
    if (response.data && Array.isArray(response.data.plans)) {
      return response.data.plans;
    }

    return [];
  } catch (error) {
    console.error('Get plans list failed:', error.message);
    throw new Error('Failed to get plans list. Please try again.');
  }
};

/**
 * Get plans by H-code (contractId-planId or similar code)
 * @param {string} year - Plan year
 * @param {string} zip - ZIP code
 * @param {string} county - County
 * @param {string} hcode - H-code
 * @param {Object} [optional] - Optional parameters
 * @param {boolean} [optional.is_mapd_only] - MAPD only filter
 * @param {boolean} [optional.is_ma_only] - MA only filter
 * @returns {Promise<Object>} Enriched plan search response
 */
export const getPlansByHCode = async (year, zip, county, hcode, optional = {}) => {
  try {
    const response = await sunfireApi.post(
      `/sunfire/plans/list/${year}/${zip}/${county}/hcode/${encodeURIComponent(hcode.replaceAll('_', '-'))}`,
      optional
    );

    // Ensure a normalized shape
    const data = response.data || { plans: [] };
    if (!Array.isArray(data.plans)) {
      return { plans: [], currentPlan: null, savedSession: null, MAPDFilters: null, PDFilters: null, MAFilters: null, SNPFilters: null };
    }
    return data;
  } catch (error) {
    console.error('Get plans by HCode failed:', error.message);
    throw new Error('Failed to get plans. Please try again.');
  }
};

/**
 * Calculate drug costs for multiple pharmacy types
 * @param {string} coverageBeginsDate - Coverage start date
 * @param {Object} session - Session model
 * @returns {Promise<Object>} Plan drug search response
 */
export const calculateDrugCosts = async (coverageBeginsDate, session) => {
  try {
    const response = await sunfireApi.post(
      `/sunfire/plans/drugs/${coverageBeginsDate}`,
      session
    );
    return response.data;
  } catch (error) {
    console.error('Calculate drug costs failed:', error.message);
    throw new Error('Failed to calculate drug costs. Please try again.');
  }
};

// ============================================
// Provider Find Plans
// ============================================

/**
 * Find plans associated with a provider (SunFire)
 * @param {Object} payload - Provider find plans request
 * @returns {Promise<Object>} Provider find plans response
 */
export const providerFindPlans = async (payload) => {
  try {
    const response = await sunfireApi.post('/sunfire/providers/find/plans', payload);
    return response.data;
  } catch (error) {
    console.error('Provider find plans failed:', error.message);
    throw new Error('Failed to find plans for provider. Please try again.');
  }
};

// ============================================
// Carrier Support Check
// ============================================

/**
 * Check if a carrier is supported based on plan name
 * @param {Object} payload - Carrier check query
 * @param {string} payload.planName - Plan name
 * @returns {Promise<Object>} Carrier support response
 */
export const checkCarrierSupport = async (payload) => {
  try {
    const response = await sunfireApi.post('/sunfire/plans/carrier/support', payload);
    return response.data;
  } catch (error) {
    console.error('Check carrier support failed:', error.message);
    throw new Error('Failed to check carrier support. Please try again.');
  }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Create a basic session for a user
 * @param {string} zipCode - ZIP code
 * @param {string} county - County
 * @param {number} [year] - Plan year (defaults to current year)
 * @returns {Object} Session model
 */
export const createBasicSession = (zipCode, county, year = new Date().getFullYear()) => {
  return {
    zip: zipCode,
    county: county,
    year: year,
    pharmacyType: 'RETAIL',
    applicants: [{
      id: 1,
      type: 'primary'
    }]
  };
};

/**
 * Add user demographics to a session
 * @param {Object} session - Session model
 * @param {Date} birthDate - Birth date
 * @param {'M' | 'F'} gender - Gender
 * @param {boolean} [smoker] - Is smoker
 * @param {string} [health] - Health status
 * @returns {Object} Updated session model
 */
export const addUserToSession = (session, birthDate, gender, smoker, health) => {
  const updatedSession = { ...session };

  if (!updatedSession.applicants) {
    updatedSession.applicants = [];
  }

  // Update or create primary applicant
  let primaryApplicant = updatedSession.applicants.find(a => a.type === 'primary') || {
    id: 1,
    type: 'primary'
  };

  primaryApplicant.birthMonth = birthDate.getMonth() + 1;
  primaryApplicant.birthDay = birthDate.getDate();
  primaryApplicant.birthYear = birthDate.getFullYear();
  primaryApplicant.gender = gender;

  if (smoker !== undefined) {
    primaryApplicant.smoker = smoker;
  }

  if (health) {
    primaryApplicant.health = health;
  }

  // Replace or add the primary applicant
  const existingIndex = updatedSession.applicants.findIndex(a => a.type === 'primary');
  if (existingIndex >= 0) {
    updatedSession.applicants[existingIndex] = primaryApplicant;
  } else {
    updatedSession.applicants.push(primaryApplicant);
  }

  return updatedSession;
};

/**
 * Get available plans for a ZIP code and county (used in flow)
 * Uses real SunFire API data and includes full plan data
 * @param {string} zipCode - ZIP code
 * @param {string} [county] - County
 * @param {string} [year] - Plan year
 * @returns {Promise<Array>} Available plans with label, value, and planData
 */
export const getAvailablePlans = async (zipCode, county, year) => {
  try {
    const planYear = year || new Date().getFullYear().toString();
    const plans = await getPlansList(planYear, zipCode, county || '');

    return plans
      .filter(plan => plan.name && plan.contractId && plan.planId)
      .map(plan => {
        const hCode = `${plan.contractId}-${plan.planId}`;

        let displayName = plan.name;
        if (!displayName.includes(hCode)) {
          const typeMatch = displayName.match(/\(([A-Z-\s]+)\)/i);
          if (typeMatch) {
            displayName = displayName.replace(typeMatch[0], `${hCode} ${typeMatch[0]}`);
          } else {
            displayName = `${displayName} ${hCode}`;
          }
        }

        return {
          label: `${displayName} - ${plan.carrierName || 'Unknown Carrier'}`,
          value: `${plan.contractId}-${plan.planId}${plan.segmentId ? `-${plan.segmentId}` : ''}`,
          planData: plan
        };
      });
  } catch (error) {
    console.error('Error in getAvailablePlans:', error);
    return [];
  }
};

// ============================================
// High-Level Workflow Functions
// ============================================

/**
 * Complete workflow to create session and get plan recommendations
 * @param {string} zipCode - ZIP code
 * @param {string} county - County
 * @param {Date} birthDate - Birth date
 * @param {'M' | 'F'} gender - Gender
 * @param {Array} [drugs] - Drugs array
 * @param {Array} [doctors] - Doctors array
 * @returns {Promise<Object>} Session and plans
 */
export const getPersonalizedPlans = async (zipCode, county, birthDate, gender, drugs, doctors) => {
  try {
    // Create basic session
    let session = createBasicSession(zipCode, county);

    // Add user demographics
    session = addUserToSession(session, birthDate, gender);

    // Add drugs if provided
    if (drugs && drugs.length > 0) {
      const drugNames = drugs.map(d => d.name);
      const sessionDrugs = await convertDrugsToSessionDrugs(drugNames);
      if (sessionDrugs.length > 0) {
        session.drugs = sessionDrugs;
      }
    }

    // Add doctors if provided
    if (doctors && doctors.length > 0) {
      const providerNames = doctors.map(d => d.name);
      const sessionDoctors = await convertProvidersToSessionDoctors(providerNames, zipCode);
      if (sessionDoctors.length > 0) {
        session.doctors = sessionDoctors;
      }
    }

    // Save the session
    const savedSession = await saveSession(session);

    // Get plan recommendations
    const plans = await calculatePlans(savedSession);

    return {
      session: savedSession,
      plans
    };
  } catch (error) {
    throw new Error(`Failed to get personalized plans: ${handleApiError(error)}`);
  }
};

/**
 * Helper function to convert drug names to SunFire drug models
 * @param {Array<string>} drugNames - Drug names
 * @returns {Promise<Array>} Session drug models
 */
export const convertDrugsToSessionDrugs = async (drugNames) => {
  const sessionDrugs = [];

  for (const drugName of drugNames) {
    try {
      // Search for the drug
      const searchResult = await searchDrugs(drugName.substring(0, 3), true);

      if (searchResult.drugs && searchResult.drugs.length > 0) {
        // Find the best match (exact or first result)
        const matchedDrug = searchResult.drugs.find(d =>
          d.name.toLowerCase().includes(drugName.toLowerCase())
        ) || searchResult.drugs[0];

        // Get dosage information
        const dosageResult = await getDrugDosages(parseInt(matchedDrug.id));

        if (dosageResult.drugDosage && dosageResult.drugDosage.dosages.length > 0) {
          const firstDosage = dosageResult.drugDosage.dosages[0];

          sessionDrugs.push({
            id: firstDosage.id,
            name: matchedDrug.name,
            qty: firstDosage.qty,
            frequency: firstDosage.frequency || 1,
            ps: firstDosage.packages?.[0]?.pkgId || 1,
            pm: firstDosage.packages?.[0]?.pm || 30
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to convert drug ${drugName}:`, error);
    }
  }

  return sessionDrugs;
};

/**
 * Helper function to convert provider names to SunFire doctor models
 * @param {Array<string>} providerNames - Provider names
 * @param {string} zipCode - ZIP code
 * @returns {Promise<Array>} Session doctor models
 */
export const convertProvidersToSessionDoctors = async (providerNames, zipCode) => {
  const sessionDoctors = [];

  for (const providerName of providerNames) {
    try {
      // Search for the provider
      const searchResult = await searchProviders({
        provider_name: providerName,
        zip_code: zipCode,
        max_size: 5
      });

      if (searchResult && searchResult.length > 0) {
        const provider = searchResult[0];

        if (provider.id && provider.name) {
          sessionDoctors.push({
            id: parseInt(provider.id),
            name: provider.name,
            npi: provider.id
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to convert provider ${providerName}:`, error);
    }
  }

  return sessionDoctors;
};
