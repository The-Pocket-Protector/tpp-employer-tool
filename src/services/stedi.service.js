/**
 * Stedi Service - Handles payer search and eligibility checking via backend API
 * Includes special Medicare/MBI handling per Stedi docs:
 * - MBILU: MBI lookup using SSN (preferred when SSN available)
 * - MBILUNOSSN: MBI lookup without SSN (requires subscriber state)
 */

import { sunfireApi } from '../lib/axios';

/**
 * Detect if a member ID is a Medicare Beneficiary Identifier (MBI)
 * MBI format: 11 chars (no dashes), pattern: C(AN)AANAAANAA
 * where C=numeric(1-9), A=alpha(A-Z excl S,L,O,I,B,Z), N=numeric(0-9), AN=alphanumeric
 * Cards show it with dashes: e.g. 5UR4-EM5-WA82
 */
export function isMBI(memberId) {
  if (!memberId) return false;
  const stripped = memberId.replace(/[-\s]/g, '').toUpperCase();
  if (stripped.length !== 11) return false;
  // CMS MBI format: C A AN N A AN N A A N N
  // C=1-9, A=alpha (excl S,L,O,I,B,Z), N=0-9, AN=alphanumeric (excl S,L,O,I,B,Z)
  const A = '[AC-HJ-KM-NP-RT-Y]';
  const AN = '[0-9AC-HJ-KM-NP-RT-Y]';
  const pattern = new RegExp(`^[1-9]${A}${AN}\\d${A}${AN}\\d${A}${A}\\d\\d$`);
  return pattern.test(stripped);
}

/**
 * Detect if the scanned card is a Medicare card
 */
export function isMedicareCard(cardData) {
  if (!cardData) return false;
  const carrier = (cardData.carrierName || '').toLowerCase();
  if (carrier.includes('medicare') || carrier.includes('cms')) return true;
  if (cardData.raw?.medicareNumber || cardData.medicareNumber) return true;
  if (isMBI(cardData.memberId)) return true;
  return false;
}

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
export async function checkEligibility({ tradingPartnerServiceId, memberId, firstName, lastName, dateOfBirth, ssn, state }) {
  try {
    // Convert YYYYMMDD to YYYY-MM-DD if needed (backend handles both formats)
    let dob = dateOfBirth;
    if (/^\d{8}$/.test(dob)) {
      dob = `${dob.slice(0, 4)}-${dob.slice(4, 6)}-${dob.slice(6, 8)}`;
    }

    const payload = {
      externalPatientId: memberId,
      firstName,
      lastName,
      dateOfBirth: dob,
      tradingPartnerServiceId,
      serviceTypeCodes: ['30']
    };

    // Include SSN if provided
    if (ssn) {
      payload.ssn = ssn;
    }

    // Include state if provided (required for MBILUNOSSN)
    if (state) {
      payload.state = state;
    }

    const response = await sunfireApi.post('/stedi-mcp/agent/check', payload);

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
      groupNumber: (subscriberInfo.groupNumber || eligibility.planInformation?.groupNumber || '').replace(/_\d{2,3}$/, ''),
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
 * For Medicare cards, bypasses payer search and uses Stedi's CMS/MBILU/MBILUNOSSN payer IDs directly.
 * @param {Object} cardData - Extracted card data
 * @param {string} cardData.carrierName - Insurance carrier name
 * @param {string} cardData.memberId - Member ID from card
 * @param {string} cardData.subscriberName - Subscriber name from card
 * @param {string} cardData.groupNumber - Group number (optional)
 * @param {string} dateOfBirth - Date of birth in YYYYMMDD format
 * @param {string} [ssn] - Social Security Number (optional)
 * @returns {Promise<Object>} Combined result with payer and eligibility info
 */
export async function performEligibilityCheck(cardData, dateOfBirth, ssn) {
  // Parse subscriber name into first/last
  // For names like "CATHLEEN A WALD", first=CATHLEEN, last=WALD (skip middle initial)
  const nameParts = (cardData.subscriberName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || '';

  // Medicare cards get special handling - no payer search needed
  if (isMedicareCard(cardData)) {
    return performMedicareEligibilityCheck(cardData, dateOfBirth, ssn, firstName, lastName);
  }

  // Non-Medicare: search for payer, then check eligibility
  const payerInfo = await searchPayer(cardData.carrierName);

  const eligibilityResult = await checkEligibility({
    tradingPartnerServiceId: payerInfo.tradingPartnerServiceId,
    memberId: cardData.memberId,
    firstName: firstName.toUpperCase(),
    lastName: lastName.toUpperCase(),
    dateOfBirth,
    ssn
  });

  return {
    payer: payerInfo,
    eligibility: eligibilityResult,
    cardData
  };
}

/**
 * Medicare-specific eligibility check using Stedi's MBI lookup payer IDs
 * Strategy:
 * 1. If SSN available → use "MBILU" (MBI lookup via SSN, most reliable)
 * 2. If no SSN but state available → use "MBILUNOSSN" (MBI lookup via demographics)
 * 3. If neither SSN nor state → throw error (cannot verify without at least one)
 */
async function performMedicareEligibilityCheck(cardData, dateOfBirth, ssn, firstName, lastName) {
  // MBI can be in memberId, medicareNumber, or identificationNumber
  const rawMBI = cardData.memberId || cardData.medicareNumber || cardData.identificationNumber;
  const mbi = rawMBI ? rawMBI.replace(/[-\s]/g, '') : null;
  const hasMBI = mbi && isMBI(rawMBI);

  let tradingPartnerServiceId;
  let memberId;

  const hasState = !!(cardData.state);

  if (ssn) {
    // SSN available - use MBILU (most reliable)
    tradingPartnerServiceId = 'MBILU';
    memberId = hasMBI ? mbi : undefined;
  } else if (hasState) {
    // No SSN but have state - use MBILUNOSSN
    tradingPartnerServiceId = 'MBILUNOSSN';
    memberId = hasMBI ? mbi : undefined;
  } else {
    throw new Error('Medicare eligibility check requires either SSN or subscriber state.');
  }

  const payerInfo = {
    payerName: 'Medicare',
    tradingPartnerServiceId
  };

  const eligibilityResult = await checkEligibility({
    tradingPartnerServiceId,
    memberId,
    firstName: firstName.toUpperCase(),
    lastName: lastName.toUpperCase(),
    dateOfBirth,
    ssn,
    state: cardData.state || undefined,
  });

  // If the response includes a resolved MBI, include it in the result
  const resolvedMBI = (!hasMBI && eligibilityResult.memberId) ? eligibilityResult.memberId : mbi;

  return {
    payer: payerInfo,
    eligibility: eligibilityResult,
    cardData,
    resolvedMBI
  };
}
