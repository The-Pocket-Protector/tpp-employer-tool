/**
 * Payer Search Service - Searches insurance carriers via Stedi Payer Search API
 */

import axios from 'axios';

// Stedi Payer Search API Configuration
const STEDI_PAYER_API_URL = 'https://payers.us.stedi.com/2024-04-01';
const STEDI_API_KEY = import.meta.env.VITE_STEDI_API_KEY;

// Create axios instance for Stedi Payer API
const payerApi = axios.create({
  baseURL: STEDI_PAYER_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth header if API key is available
payerApi.interceptors.request.use((config) => {
  if (STEDI_API_KEY) {
    config.headers['Authorization'] = STEDI_API_KEY;
  }
  return config;
});

/**
 * Search for insurance payers/carriers
 * @param {string} query - Search query (carrier name)
 * @param {string} [state] - Optional state code to filter by operating states (e.g., 'IL', 'CA')
 * @returns {Promise<Array>} Array of payer results
 */
export async function searchPayers(query, state) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const params = {
      query: query.trim(),
      eligibilityCheck: 'SUPPORTED'  // Only show payers that support eligibility verification
    };

    // Filter by operating state if provided
    if (state) {
      params.operatingStates = state;
    }

    const response = await payerApi.get('/payers/search', { params });

    // Map API response to our format
    // API returns: { items: [{ payer: { stediId, displayName, primaryPayerId, names, coverageTypes, operatingStates, avatarUrl }, score, matches }] }
    const items = response.data?.items || [];

    return items.map((item) => ({
      id: item.payer.stediId,
      planName: item.payer.displayName,
      carrier: item.payer.displayName,
      payerId: item.payer.primaryPayerId,
      names: item.payer.names || [],
      coverageTypes: item.payer.coverageTypes || [],
      states: item.payer.operatingStates || [],
      avatarUrl: item.payer.avatarUrl || null,
      // Include highlighted match for display (contains <b> tags around matched text)
      highlightedName: item.matches?.names?.[0] || item.matches?.displayName || null
    }));
  } catch (error) {
    console.error('Payer search API failed:', error.message);
    return [];
  }
}
