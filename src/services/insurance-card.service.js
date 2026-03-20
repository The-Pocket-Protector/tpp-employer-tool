/**
 * Insurance Card Service - Handles generic insurance card extraction
 */

import { sunfireApi, handleApiError } from '../lib/axios';


/**
 * Extract insurance card data from image
 * @param {File} file - Image file of insurance card
 * @returns {Promise<Object>} Extracted card data
 */
export async function extractInsuranceCard(file) {
  try {
    const form = new FormData();
    form.append('file', file, 'insurance-card.jpg');

    const response = await sunfireApi.post('/medicard/extract', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Normalize response data - handle both Medicare and generic insurance card formats
    const data = response.data;
    const extracted = {
      // Carrier: Medicare cards don't have carrier, generic cards do
      carrierName: data.carrierName || data.carrier || data.insuranceCompany || data.payerName || (data.medicareNumber ? 'Medicare' : null),
      // Member ID: could be medicareNumber, memberId, identificationNumber, or other variations
      memberId: data.memberId || data.identificationNumber || data.medicareNumber || data.memberNumber || data.subscriberId || data.id || data.planId,
      // Subscriber name: fullName or constructed from firstName/lastName
      subscriberName: data.subscriberName || data.memberName || data.fullName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : null),
      groupNumber: data.groupNumber || data.group || data.groupId,
      planType: data.planType || data.type,
      rxBin: data.rxBin || data.bin,
      rxPcn: data.rxPcn || data.pcn,
      raw: data
    };

    // Validate extracted data - need at least a name, and either a member ID or carrier
    // This mirrors tpp-emily-2's approach: flexible enough for any insurance card type
    const hasName = Boolean(extracted.subscriberName);
    const hasMemberId = Boolean(extracted.memberId);
    const hasCarrier = Boolean(extracted.carrierName);

    if (!hasName) {
      console.error('Card extraction missing subscriber name:', {
        hasCarrier,
        hasMemberId,
        hasName
      });
      throw new Error('Could not read card details. Please try again with a clearer photo.');
    }

    if (!hasMemberId && !hasCarrier) {
      console.error('Card extraction missing both member ID and carrier:', {
        hasCarrier,
        hasMemberId,
        hasName
      });
      throw new Error('Could not read card details. Please try again with a clearer photo.');
    }

    return extracted;
  } catch (error) {
    console.error('Insurance card extraction failed:', error.message);
    throw new Error('Failed to extract insurance card. Please try again.');
  }
}

/**
 * Validate extracted card data has required fields
 * @param {Object} cardData - Extracted card data
 * @returns {Object} Validation result with isValid and missingFields
 */
export function validateCardData(cardData) {
  const missingFields = [];

  // Name is always required
  if (!cardData.subscriberName) missingFields.push('subscriberName');

  // Need at least one of: memberId or carrierName
  if (!cardData.memberId && !cardData.carrierName) {
    missingFields.push('memberId or carrierName');
  }

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
