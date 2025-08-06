/**
 * config.js
 *
 * Centralized configuration file for base URLs used in the application.
 * Defines API and homepage endpoints for backend communication and navigation.
 *
 * Used by: apiFetch.js, navigation logic, page redirects
 * Dependencies: None
 */

// Base URL for backend API requests
export const API_BASE_URL = 'http://localhost:5000/';

// URL for redirecting to the home page
export const homePageURL = 'http://localhost:5001/home.html';