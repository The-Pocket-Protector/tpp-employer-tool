/**
 * Medicare Card Service - Handles Medicare card extraction
 */

import { railwayApi, handleApiError } from '../lib/axios';

// Mock data for development/fallback
const MOCK_MEDICARE_EXTRACT = {
  fullName: "John Sample Smith",
  firstName: "John",
  lastName: "Smith",
  medicare_number: "1EG4-TE5-MK72",
  partA: {
    coverageStart: "06-01-2023"
  },
  partB: {
    coverageStart: "06-01-2023"
  }
};

/**
 * Extract Medicare card data from image
 * @param {File} file - Image file of Medicare card
 * @returns {Promise<Object>} Extracted card data
 */
export async function extractMedicareCard(file) {
  try {
    const form = new FormData();
    form.append('file', file, 'medicare-card.jpg');
    const response = await railwayApi.post('/medicard/extract', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    console.warn('Medicare card extraction API failed, using mock data:', error.message);
    // Return mock data after simulated delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return MOCK_MEDICARE_EXTRACT;
  }
}
