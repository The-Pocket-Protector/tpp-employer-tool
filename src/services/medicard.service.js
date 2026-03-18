/**
 * Medicare Card Service - Handles Medicare card extraction
 */

import { railwayApi, handleApiError } from '../lib/axios';

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
    console.error('Medicare card extraction failed:', error.message);
    throw new Error('Failed to extract Medicare card information. Please try again with a clearer image.');
  }
}
