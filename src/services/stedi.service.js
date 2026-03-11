/**
 * Stedi MCP API Service - Handles payer search and eligibility checking
 */

import axios from 'axios';

// Stedi MCP Configuration
const STEDI_MCP_URL = import.meta.env.VITE_STEDI_MCP_URL || 'https://mcp.us.stedi.com/2025-07-11/mcp';
const STEDI_API_KEY = import.meta.env.VITE_STEDI_API_KEY;

// Provider info for eligibility checks
const PROVIDER_INFO = {
  organizationName: "The Pocket Protector",
  npi: "1942747480"
};

// Common Payer IDs (reference only - always search via API)
// Medicare: CMSMCR | Aetna: 60054 | Cigna: 62308
// UnitedHealthcare: 87726 | Humana: 61101

// Mock data for development/fallback
const MOCK_PAYER_SEARCH = {
  payerName: "BlueCross BlueShield",
  tradingPartnerServiceId: "BCBSIL"
};

const MOCK_ELIGIBILITY_RESULT = {
  eligible: true,
  status: "Active",
  subscriberName: "PATRICK KAHN",
  memberId: "XOX813969028",
  groupNumber: "432872",
  effectiveDate: "2023-01-01",
  terminationDate: null,
  planName: "BlueCross BlueShield PPO",
  coverageType: "Medical",
  benefits: {
    deductible: { individual: "$500", family: "$1,000" },
    outOfPocketMax: { individual: "$3,000", family: "$6,000" },
    coinsurance: "80%"
  }
};

/**
 * Generate a 9-digit control number for Stedi requests
 * @returns {string} 9-digit control number
 */
function generateControlNumber() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

/**
 * Parse SSE response from Stedi MCP
 * @param {string} responseText - Raw SSE response
 * @returns {Object} Parsed data
 */
function parseSSEResponse(responseText) {
  const lines = responseText.split('\n');
  let data = null;

  for (const line of lines) {
    if (line.startsWith('data:')) {
      const jsonStr = line.slice(5).trim();
      if (jsonStr) {
        try {
          data = JSON.parse(jsonStr);
        } catch (e) {
          console.warn('Failed to parse SSE line:', jsonStr);
        }
      }
    }
  }

  return data;
}

/**
 * Make a JSON-RPC request to Stedi MCP
 * @param {string} method - RPC method name
 * @param {Object} params - RPC parameters
 * @returns {Promise<Object>} Response data
 */
async function stediRpcCall(method, params) {
  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params
  };

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };

  if (STEDI_API_KEY) {
    headers['Authorization'] = `Key ${STEDI_API_KEY}`;
  }

  const response = await axios.post(STEDI_MCP_URL, payload, {
    headers,
    timeout: 60000,
    responseType: 'text'
  });

  // Handle SSE response format
  const data = parseSSEResponse(response.data);

  if (data?.error) {
    throw new Error(data.error.message || 'Stedi API error');
  }

  return data?.result || data;
}

/**
 * Search for a payer by carrier name
 * @param {string} carrierName - Name of the insurance carrier
 * @returns {Promise<Object>} Payer info with tradingPartnerServiceId
 */
export async function searchPayer(carrierName) {
  try {
    const result = await stediRpcCall('tools/call', {
      name: 'search_for_payer',
      arguments: {
        query: carrierName,
        eligibilityCheck: 'SUPPORTED'
      }
    });

    // Extract payer info from result
    const content = result?.content?.[0];
    if (content?.type === 'text' && content?.text) {
      try {
        const data = JSON.parse(content.text);
        // Response structure: { items: [{ payer: { primaryPayerId, displayName, ... } }] }
        if (data?.items && data.items.length > 0) {
          const payer = data.items[0].payer;
          return {
            payerName: payer.displayName || payer.name,
            tradingPartnerServiceId: payer.primaryPayerId
          };
        }
      } catch (e) {
        console.warn('Failed to parse payer search result:', e);
      }
    }

    throw new Error('No payer found');
  } catch (error) {
    console.warn('Payer search API failed, using mock data:', error.message);
    // Return mock data after simulated delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return MOCK_PAYER_SEARCH;
  }
}

/**
 * Check eligibility for a subscriber
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
    const result = await stediRpcCall('tools/call', {
      name: 'eligibility_check',
      arguments: {
        controlNumber: generateControlNumber(),
        tradingPartnerServiceId,
        provider: PROVIDER_INFO,
        subscriber: {
          memberId,
          firstName,
          lastName,
          dateOfBirth
        }
      }
    });

    // Extract eligibility info from result
    const content = result?.content?.[0];
    if (content?.type === 'text' && content?.text) {
      try {
        const eligibility = JSON.parse(content.text);

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
        // planStatus can be an array: [{ status: "Active Coverage", statusCode: "1", planDetails: "..." }]
        const planStatusArray = eligibility.planStatus || [];
        const hasActivePlan = planStatusArray.some(p =>
          p.status === 'Active Coverage' || p.statusCode === '1'
        );

        // Extract plan details from planStatus
        const activePlan = planStatusArray.find(p => p.status === 'Active Coverage' || p.statusCode === '1');
        const planDetails = activePlan?.planDetails || eligibility.payer?.name;

        // Get subscriber info from response
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
      } catch (e) {
        console.warn('Failed to parse eligibility result:', e);
      }
    }

    throw new Error('Invalid eligibility response');
  } catch (error) {
    console.error('Eligibility check failed:', error);
    console.error('Request was:', { tradingPartnerServiceId, memberId, firstName, lastName, dateOfBirth });
    // Return mock data for development (remove in production)
    console.warn('Using mock eligibility data for development');
    await new Promise(resolve => setTimeout(resolve, 1500));
    return MOCK_ELIGIBILITY_RESULT;
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
