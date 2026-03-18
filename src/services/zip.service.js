/**
 * ZIP Code Service - Handles ZIP code lookups and radius searches
 */

import axios from 'axios';
import { sunfireApi, handleApiError } from '../lib/axios';

/**
 * Get ZIP codes within a radius of a given ZIP code
 * @param {string} zipCode - Center ZIP code
 * @param {number} [radius=5] - Radius in miles or kilometers
 * @param {'mi' | 'km'} [uom='mi'] - Unit of measurement
 * @returns {Promise<string>} Comma-separated ZIP codes or original zipCode on error
 */
export const getRadiusZipcodes = async (zipCode, radius = 5, uom = 'mi') => {
  try {
    const response = await sunfireApi.get('/radius/zipcode', {
      params: { zipCode, radius, uom }
    });
    return response.data;
  } catch (error) {
    console.warn('Radius API error, falling back to original zipcode:', error.message);
    return zipCode;
  }
};

/**
 * Look up ZIP code information using V3 API
 * @param {string} zipCode - ZIP code to look up
 * @returns {Promise<Object>} ZIP lookup response with counties and state info
 */
export const lookupZipV3 = async (zipCode) => {
  try {
    const response = await sunfireApi.get(`/sunfire/zip/v3/${zipCode}`);
    return response.data;
  } catch (error) {
    console.error('ZIP lookup failed:', error.message);
    throw new Error(`Could not look up ZIP code "${zipCode}". Please check the ZIP code and try again.`);
  }
};
