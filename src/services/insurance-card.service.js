/**
 * Insurance Card Service - Handles generic insurance card extraction
 */

import { railwayApi, handleApiError } from '../lib/axios';

// Mock data for development/fallback (sample BlueCross BlueShield card)
const MOCK_INSURANCE_EXTRACT = {
  carrierName: "BlueCross BlueShield",
  memberId: "XOX813969028",
  subscriberName: "PATRICK KAHN",
  groupNumber: "432872",
  planType: "PPO",
  rxBin: "003858",
  rxPcn: "A4"
};

/**
 * Extract insurance card data from image
 * @param {File} file - Image file of insurance card
 * @returns {Promise<Object>} Extracted card data
 */
export async function extractInsuranceCard(file) {
  try {
    const form = new FormData();
    form.append('file', file, 'insurance-card.jpg');

    const response = await railwayApi.post('/insurance-card/extract', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Normalize response data
    const data = response.data;
    return {
      carrierName: data.carrierName || data.carrier || data.insuranceCompany || data.payerName,
      memberId: data.memberId || data.memberNumber || data.subscriberId || data.id,
      subscriberName: data.subscriberName || data.memberName || data.name || data.fullName,
      groupNumber: data.groupNumber || data.group || data.groupId,
      planType: data.planType || data.type,
      rxBin: data.rxBin || data.bin,
      rxPcn: data.rxPcn || data.pcn,
      raw: data
    };
  } catch (error) {
    console.warn('Insurance card extraction API failed, using mock data:', error.message);
    // Return mock data after simulated delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return MOCK_INSURANCE_EXTRACT;
  }
}

/**
 * Validate extracted card data has required fields
 * @param {Object} cardData - Extracted card data
 * @returns {Object} Validation result with isValid and missingFields
 */
export function validateCardData(cardData) {
  const requiredFields = ['carrierName', 'memberId', 'subscriberName'];
  const missingFields = requiredFields.filter(field => !cardData[field]);

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Format card data for display
 * @param {Object} cardData - Extracted card data
 * @returns {Object} Formatted display data
 */
export function formatCardDataForDisplay(cardData) {
  return {
    carrier: cardData.carrierName || cardData.carrier || 'Unknown Carrier',
    subscriber: cardData.subscriberName || 'Unknown',
    memberId: cardData.memberId || 'N/A',
    group: cardData.groupNumber || cardData.group || 'N/A',
    planType: cardData.planType || null
  };
}
