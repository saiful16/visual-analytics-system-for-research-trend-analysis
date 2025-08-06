/**
 * apiFetch.js
 *
 * Provides a utility function for making GET requests to the backend API.
 * Wraps native fetch with standardized headers, error handling, and base URL management.
 *
 * Used by: All modules that need to retrieve data from the backend
 * Dependencies: config.js (for API_BASE_URL)
 */

import {API_BASE_URL} from './config.js';

/**
 * Fetches data from a GET API endpoint
 * @param {string} endpoint - The API endpoint (e.g. '/subfields')
 * @returns {Promise<any>} - The parsed JSON response
 */
export async function apiFetch(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API fetch error:', error);
        throw error;
    }
}
