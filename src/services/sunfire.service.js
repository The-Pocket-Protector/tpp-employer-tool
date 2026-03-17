/**
 * Sunfire Service - Unified service for Sunfire API operations
 * Handles Medicare sessions, plans, drugs, providers, and ZIP lookups
 * Includes fallback mock data for development without API access
 */

import axios from 'axios';
import { sunfireApi, handleApiError } from '../lib/axios';

// ============================================
// Mock Data for Development Fallbacks
// ============================================

const MOCK_PROVIDERS = [
  { id: "1234567890", npi: "1234567890", name: "Dr. Sarah Chen", specialties: ["Cardiology"], address1: "123 Medical Center Dr", city: "Chicago", state: "IL", zip: "60601", phone: "312-555-0100" },
  { id: "1234567891", npi: "1234567891", name: "Dr. James Wilson", specialties: ["Primary Care"], address1: "456 Health Ave", city: "Chicago", state: "IL", zip: "60602", phone: "312-555-0101" },
  { id: "1234567892", npi: "1234567892", name: "Dr. Maria Rodriguez", specialties: ["Endocrinology"], address1: "789 Wellness Blvd", city: "Chicago", state: "IL", zip: "60603", phone: "312-555-0102" },
  { id: "1234567893", npi: "1234567893", name: "Dr. Robert Kim", specialties: ["Orthopedics"], address1: "321 Care Lane", city: "Chicago", state: "IL", zip: "60604", phone: "312-555-0103" },
  { id: "1234567894", npi: "1234567894", name: "Dr. Patricia Okafor", specialties: ["Internal Medicine"], address1: "654 Clinic St", city: "Chicago", state: "IL", zip: "60605", phone: "312-555-0104" },
  { id: "1234567895", npi: "1234567895", name: "Dr. David Patel", specialties: ["Gastroenterology"], address1: "987 Doctor's Row", city: "Chicago", state: "IL", zip: "60606", phone: "312-555-0105" },
  { id: "1234567896", npi: "1234567896", name: "Dr. Linda Nguyen", specialties: ["Oncology"], address1: "147 Hospital Way", city: "Chicago", state: "IL", zip: "60607", phone: "312-555-0106" },
  { id: "1234567897", npi: "1234567897", name: "Dr. Michael Thompson", specialties: ["Pulmonology"], address1: "258 Medicine Park", city: "Chicago", state: "IL", zip: "60608", phone: "312-555-0107" },
];

const MOCK_DRUGS = [
  { id: "1001", name: "Lisinopril", isGeneric: true },
  { id: "1002", name: "Lipitor", isGeneric: false },
  { id: "1003", name: "Metformin", isGeneric: true },
  { id: "1004", name: "Metoprolol", isGeneric: true },
  { id: "1005", name: "Atorvastatin", isGeneric: true },
  { id: "1006", name: "Amlodipine", isGeneric: true },
  { id: "1007", name: "Omeprazole", isGeneric: true },
  { id: "1008", name: "Losartan", isGeneric: true },
  { id: "1009", name: "Gabapentin", isGeneric: true },
  { id: "1010", name: "Hydrochlorothiazide", isGeneric: true },
  { id: "1011", name: "Eliquis", isGeneric: false },
  { id: "1012", name: "Jardiance", isGeneric: false },
  { id: "1013", name: "Xarelto", isGeneric: false },
  { id: "1014", name: "Entresto", isGeneric: false },
  { id: "1015", name: "Ozempic", isGeneric: false },
];

const MOCK_DRUG_DOSAGES = {
  "1001": { drugDosage: { dosages: [{ id: 10011, name: "10mg", qty: 30, frequency: 1 }, { id: 10012, name: "20mg", qty: 30, frequency: 1 }] } },
  "1002": { drugDosage: { dosages: [{ id: 10021, name: "10mg", qty: 30, frequency: 1 }, { id: 10022, name: "20mg", qty: 30, frequency: 1 }, { id: 10023, name: "40mg", qty: 30, frequency: 1 }] } },
  "1003": { drugDosage: { dosages: [{ id: 10031, name: "500mg", qty: 60, frequency: 2 }, { id: 10032, name: "850mg", qty: 60, frequency: 2 }, { id: 10033, name: "1000mg", qty: 60, frequency: 2 }] } },
  "1011": { drugDosage: { dosages: [{ id: 10111, name: "2.5mg", qty: 60, frequency: 2 }, { id: 10112, name: "5mg", qty: 60, frequency: 2 }] } },
  "1015": { drugDosage: { dosages: [{ id: 10151, name: "0.25mg", qty: 4, frequency: 1 }, { id: 10152, name: "0.5mg", qty: 4, frequency: 1 }, { id: 10153, name: "1mg", qty: 4, frequency: 1 }, { id: 10154, name: "2mg", qty: 4, frequency: 1 }] } },
};

const MOCK_ZIP_DATA = {
  '60601': { zip: '60601', city: 'Chicago', state: 'IL', county: 'Cook', fips: '17031' },
  '10001': { zip: '10001', city: 'New York', state: 'NY', county: 'New York', fips: '36061' },
  '90210': { zip: '90210', city: 'Beverly Hills', state: 'CA', county: 'Los Angeles', fips: '06037' },
};

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
    console.warn('ZIP lookup API failed, using mock data:', error.message);
    const mock = MOCK_ZIP_DATA[zipCode] || { zip: zipCode, city: 'Sample City', state: 'IL', county: 'Sample County', fips: '17001' };
    return {
      zip: mock.zip,
      counties: [{ name: mock.county, fips: mock.fips, state: mock.state }],
      city: mock.city,
      state: mock.state
    };
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
    console.warn('Provider search API failed, using mock data:', error.message);
    const query = (request.provider_name || '').toLowerCase();
    const maxSize = request.max_size || 10;
    return MOCK_PROVIDERS
      .filter(p => p.name.toLowerCase().includes(query) ||
                   p.specialties.some(s => s.toLowerCase().includes(query)))
      .slice(0, maxSize);
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
    console.warn('Provider fullname search API failed, using mock data:', error.message);
    return searchProviders(request);
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
    console.warn('Save session API failed, returning mock session:', error.message);
    return { ...session, customerCode: `MOCK-${Date.now()}`, saved: true };
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
    console.warn('Get session API failed:', error.message);
    return { customerCode, zip: '60601', county: 'Cook', year: new Date().getFullYear() };
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
    console.warn('Patch session API failed:', error.message);
    return { ...patch, patched: true };
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
    console.warn('Put session API failed:', error.message);
    return { ...session, customerCode, updated: true };
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
    console.warn('Drug search API failed, using mock data:', error.message);
    const query = letters.toLowerCase();
    const drugs = MOCK_DRUGS.filter(d => d.name.toLowerCase().includes(query));
    return { drugs };
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
    console.warn('Drug dosage API failed, using mock data:', error.message);
    return MOCK_DRUG_DOSAGES[drugNameId.toString()] || {
      drugDosage: { dosages: [{ id: drugNameId * 10 + 1, name: "Standard", qty: 30, frequency: 1 }] }
    };
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
    console.warn('Calculate plans API failed:', error.message);
    return { plans: [], message: 'Using mock data - no plans available' };
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
    console.warn('Get plans by profile API failed:', error.message);
    return { plans: [] };
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
    console.warn('Get plan recommendations API failed:', error.message);
    return { recommendations: [] };
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
    console.warn('Get V6 plan recommendations API failed:', error.message);
    // Return mock data for development
    return {
      planOverview: {
        name: 'Sample Medicare Advantage Plan',
        premium: '$0',
        contractId: 'H1234',
        planId: '001'
      },
      benefits: [
        { category: 'Doctor Visits', currentValue: '$30 copay', newValue: '$0 copay', comparison: 'better' },
        { category: 'Out-of-Pocket Max', currentValue: '$6,700', newValue: '$3,400', comparison: 'better' },
        { category: 'Dental Allowance', currentValue: '$0', newValue: '$2,000/year', comparison: 'better' },
        { category: 'Vision', currentValue: '$50 allowance', newValue: '$150 allowance', comparison: 'better' },
        { category: 'Hearing', currentValue: 'Not covered', newValue: '$1,500 allowance', comparison: 'better' },
        { category: 'Prescription Coverage', currentValue: 'Tier 1: $10', newValue: 'Tier 1: $10', comparison: 'similar' },
        { category: 'Hospital Stay', currentValue: '$300/day', newValue: '$295/day', comparison: 'similar' },
        { category: 'Specialist Visit', currentValue: '$40', newValue: '$45', comparison: 'worse' }
      ],
      doctorsCovered: true,
      medicationsCovered: true,
      totalPlansInCounty: 42,
      closing: 'Based on your current coverage and healthcare needs, this plan could save you money while providing better benefits.',
      button: { label: 'Apply for this plan online', value: 'apply_online' }
    };
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
    console.warn('Get plans list API failed:', error.message);
    return [];
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
    console.warn('Get plans by HCode API failed:', error.message);
    return { plans: [], currentPlan: null, savedSession: null, MAPDFilters: null, PDFilters: null, MAFilters: null, SNPFilters: null };
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
    console.warn('Calculate drug costs API failed:', error.message);
    return { drugCosts: [] };
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
    console.warn('Provider find plans API failed:', error.message);
    return { plans: [] };
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
    console.warn('Check carrier support API failed:', error.message);
    return { supported: true };
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
