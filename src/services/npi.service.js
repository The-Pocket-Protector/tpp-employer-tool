/**
 * NPI Service - Search NPPES Registry for providers by specialty
 * Uses the backend MCP endpoint to avoid CORS issues
 */

import { sunfireApi } from '../lib/axios';

/**
 * Base NPI search function - calls the backend API
 */
async function npiSearch({
  first_name,
  last_name,
  specialty,
  state,
  postal_code,
  limit = 50
}) {
  try {
    const response = await sunfireApi.post('/npi/search', {
      first_name,
      last_name,
      specialty,
      state,
      postal_code,
      limit
    });

    const data = response.data;
    if (!data?.success) {
      return [];
    }

    return data.results || [];
  } catch (error) {
    console.error('NPI search error:', error);
    return [];
  }
}

/**
 * Deduplicate results by NPI
 */
function dedupeByNPI(results) {
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.npi)) return false;
    seen.add(r.npi);
    return true;
  });
}

/**
 * Smart provider search - searches by name first, falls back to specialty if no results
 * @param {string} query - Search query (name or specialty)
 * @param {string} state - 2-letter state code (unused, kept for compatibility)
 * @param {string} postalCode - User's exact ZIP code
 * @returns {Promise<Array>} Deduplicated provider results
 */
export async function searchProviders(query, state, postalCode) {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\s+/);

  // Step 1: Search by name first
  const nameSearches = [];

  // Single word → search as last name
  if (parts.length === 1) {
    nameSearches.push(
      npiSearch({ last_name: trimmed, postal_code: postalCode, limit: 100 })
    );
  }

  // Two words → search as "first last" and just last name
  if (parts.length === 2) {
    nameSearches.push(
      npiSearch({
        first_name: parts[0],
        last_name: parts[1],
        postal_code: postalCode,
        limit: 100,
      })
    );
    nameSearches.push(
      npiSearch({ last_name: parts[1], postal_code: postalCode, limit: 100 })
    );
  }

  // 3+ words → try first word + last word as name
  if (parts.length >= 3) {
    nameSearches.push(
      npiSearch({
        first_name: parts[0],
        last_name: parts[parts.length - 1],
        postal_code: postalCode,
        limit: 100,
      })
    );
  }

  // Execute name searches
  if (nameSearches.length > 0) {
    const nameResults = await Promise.all(nameSearches);
    const deduped = dedupeByNPI(nameResults.flat());
    if (deduped.length > 0) {
      return deduped;
    }
  }

  // Step 2: No name results → fall back to specialty search
  const specialtyResults = await npiSearch({
    specialty: trimmed,
    postal_code: postalCode,
    limit: 100
  });

  return dedupeByNPI(specialtyResults);
}
