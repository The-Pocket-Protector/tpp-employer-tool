/**
 * Stedi Service - Handles payer search and eligibility checking via backend API
 */

import { sunfireApi } from '../lib/axios';

/**
 * Search for a payer by carrier name (returns first match)
 * @param {string} carrierName - Name of the insurance carrier
 * @returns {Promise<Object>} Payer info with tradingPartnerServiceId
 */
export async function searchPayer(carrierName) {
  try {
    const response = await sunfireApi.get('/payers/search', {
      params: { query: carrierName, eligibilityCheck: 'SUPPORTED' }
    });

    const items = response.data?.items || [];
    if (items.length > 0) {
      const payer = items[0].payer;
      return {
        payerName: payer.displayName || payer.name,
        tradingPartnerServiceId: payer.primaryPayerId
      };
    }

    throw new Error('No payer found');
  } catch (error) {
    console.error('Payer search failed:', error.message);
    throw new Error(`Could not find insurance payer "${carrierName}". Please check the carrier name and try again.`);
  }
}

/**
 * Search for payers by carrier name (returns all matches for typeahead)
 * @param {string} query - Search query (carrier name)
 * @returns {Promise<Array>} Array of payer results
 */
export async function searchPayers(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await sunfireApi.get('/payers/search', {
      params: { query: query.trim(), eligibilityCheck: 'SUPPORTED' }
    });

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
      highlightedName: item.matches?.names?.[0] || item.matches?.displayName || null
    }));
  } catch (error) {
    console.error('Payer search failed:', error.message);
    return [];
  }
}

/**
 * Check eligibility for a subscriber via backend
 * @param {Object} params - Eligibility check parameters
 * @param {string} params.tradingPartnerServiceId - Payer service ID
 * @param {string} params.memberId - Subscriber's member ID
 * @param {string} params.firstName - Subscriber's first name
 * @param {string} params.lastName - Subscriber's last name
 * @param {string} params.dateOfBirth - Date of birth in YYYYMMDD format
 * @returns {Promise<Object>} Eligibility result
 */
export async function checkEligibility({ tradingPartnerServiceId, memberId, firstName, lastName, dateOfBirth }) {
  try {
    const response = await sunfireApi.post('/stedi-mcp/agent/check', {
      externalPatientId: memberId,
      firstName,
      lastName,
      dateOfBirth,
      serviceTypeCodes: ['30']
    });

    const eligibility = response.data?.response;
    if (!eligibility) {
      throw new Error('Invalid eligibility response');
    }

    // Check for errors in the response
    if (eligibility.errors && eligibility.errors.length > 0) {
      const error = eligibility.errors[0];
      console.warn('Eligibility check returned error:', error);
      return {
        eligible: false,
        status: 'Error',
        error: error.description,
        errorCode: error.code,
        subscriberName: `${firstName} ${lastName}`,
        memberId,
        payerName: eligibility.payer?.name,
        raw: eligibility
      };
    }

    // Check for plan status (successful response)
    const planStatusArray = eligibility.planStatus || [];
    const hasActivePlan = planStatusArray.some(p =>
      p.status === 'Active Coverage' || p.statusCode === '1'
    );

    const activePlan = planStatusArray.find(p => p.status === 'Active Coverage' || p.statusCode === '1');
    const planDetails = activePlan?.planDetails || eligibility.payer?.name;

    const subscriberInfo = eligibility.subscriber || {};

    return {
      eligible: hasActivePlan,
      status: hasActivePlan ? 'Active' : 'Inactive',
      subscriberName: subscriberInfo.firstName && subscriberInfo.lastName
        ? `${subscriberInfo.firstName} ${subscriberInfo.lastName}`
        : `${firstName} ${lastName}`,
      memberId: subscriberInfo.memberId || memberId,
      groupNumber: subscriberInfo.groupNumber || eligibility.planInformation?.groupNumber,
      groupDescription: subscriberInfo.groupDescription || eligibility.planInformation?.groupDescription,
      effectiveDate: eligibility.planDateInformation?.planBegin,
      terminationDate: eligibility.planDateInformation?.planEnd,
      planName: planDetails,
      payerName: eligibility.payer?.name,
      coverageType: activePlan?.serviceTypes?.[0] || 'Medical',
      address: subscriberInfo.address,
      benefits: eligibility.benefitsInformation || [],
      raw: eligibility
    };
  } catch (error) {
    console.error('Eligibility check failed:', error);
    console.error('Request was:', { tradingPartnerServiceId, memberId, firstName, lastName, dateOfBirth });
    throw new Error('Eligibility check failed. Please verify your information and try again.');
  }
}

/**
 * Perform full eligibility check flow (payer search + eligibility check)
 * @param {Object} cardData - Extracted card data
 * @param {string} cardData.carrierName - Insurance carrier name
 * @param {string} cardData.memberId - Member ID from card
 * @param {string} cardData.subscriberName - Subscriber name from card
 * @param {string} cardData.groupNumber - Group number (optional)
 * @param {string} dateOfBirth - Date of birth in YYYYMMDD format
 * @returns {Promise<Object>} Combined result with payer and eligibility info
 */
export async function performEligibilityCheck(cardData, dateOfBirth) {
  // Parse subscriber name into first/last
  const nameParts = (cardData.subscriberName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

  // Search for payer
  const payerInfo = await searchPayer(cardData.carrierName);

  // Check eligibility
  const eligibilityResult = await checkEligibility({
    tradingPartnerServiceId: payerInfo.tradingPartnerServiceId,
    memberId: cardData.memberId,
    firstName: firstName.toUpperCase(),
    lastName: lastName.toUpperCase(),
    dateOfBirth
  });

  return {
    payer: payerInfo,
    eligibility: eligibilityResult,
    cardData
  };
}
