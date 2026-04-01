/**
 * tpp-api Service — All API calls to the tpp-api backend.
 * Replaces Sunfire-based search, recommendation, and card-scan calls.
 */

import { tppApi } from '../lib/axios';

/**
 * Look up counties for a ZIP code.
 * @param {string} zip - 5-digit ZIP code
 * @returns {Promise<{ zip: string, counties: Array<{ county_name: string, state: string }> }>}
 */
export async function lookupZipCounties(zip) {
  try {
    const response = await tppApi.get('/zip-counties', { params: { zip } });
    return response.data;
  } catch (error) {
    console.error('ZIP county lookup failed:', error.message);
    throw new Error(`Could not look up ZIP code "${zip}". Please try again.`);
  }
}

/**
 * Search for physicians near a ZIP code.
 * @param {string} zip - 5-digit ZIP code
 * @param {string} query - Search query (name or specialty)
 * @returns {Promise<Array>} Physician results
 */
export async function searchPhysicians(zip, query) {
  try {
    const response = await tppApi.get('/physicians', { params: { zip, q: query } });
    return response.data;
  } catch (error) {
    console.error('Physician search failed:', error.message);
    throw new Error('Physician search failed. Please try again.');
  }
}

/**
 * Search for hospitals near a ZIP code.
 * @param {string} zip - 5-digit ZIP code
 * @param {string} query - Search query
 * @returns {Promise<Array>} Hospital results
 */
export async function searchHospitals(zip, query) {
  try {
    const response = await tppApi.get('/hospitals', { params: { zip, q: query } });
    return response.data;
  } catch (error) {
    console.error('Hospital search failed:', error.message);
    throw new Error('Hospital search failed. Please try again.');
  }
}

/**
 * Search for drugs by name. Returns drugs with dosage grouping inline.
 * @param {string} query - Drug name query
 * @param {number} [limit=15] - Max results
 * @returns {Promise<Array>} Drug results with dosages included
 */
export async function searchDrugs(query, limit = 15) {
  try {
    const response = await tppApi.get('/drugs', { params: { q: query, limit } });
    return response.data;
  } catch (error) {
    console.error('Drug search failed:', error.message);
    throw new Error('Drug search failed. Please try again.');
  }
}

/**
 * Look up Medicare Beneficiary Identifier.
 * @param {Object} payload - MBI lookup payload
 * @returns {Promise<Object>} MBI lookup result
 */
export async function mbiLookup(payload) {
  try {
    const response = await tppApi.post('/mbi-lookup', payload);
    return response.data;
  } catch (error) {
    console.error('MBI lookup failed:', error.message);
    throw new Error('MBI lookup failed. Please try again.');
  }
}

/**
 * Scan an insurance card image.
 * @param {File} file - Image file of insurance card
 * @returns {Promise<Object>} Extracted card data
 */
export async function scanInsuranceCard(file) {
  try {
    const form = new FormData();
    form.append('file', file, 'insurance-card.jpg');
    const response = await tppApi.post('/compare/card-scan', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error('Card scan failed:', error.message);
    throw new Error('Failed to scan insurance card. Please try again.');
  }
}

/**
 * Get a plan recommendation from tpp-api.
 * @param {Object} params - Recommendation request body
 * @param {string} params.zip
 * @param {string} params.county
 * @param {string} params.state
 * @param {Array} [params.doctors]
 * @param {Array} [params.drugs]
 * @param {string} [params.medicaid]
 * @param {Array} [params.priorities]
 * @param {Array} [params.plan_types]
 * @param {Object} [params.current_plan]
 * @returns {Promise<Object>} Recommendation response
 */
export async function getRecommendation(params) {
  try {
    const response = await tppApi.post('/recommend', params);
    return response.data;
  } catch (error) {
    console.error('Recommendation failed:', error.message);
    throw new Error('Failed to get plan recommendation. Please try again.');
  }
}
