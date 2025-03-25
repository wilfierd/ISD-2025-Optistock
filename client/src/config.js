// client/src/config.js

// API base URL based on environment
const API_BASE_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3000/api`;

// Configuration object
const config = {
  apiUrl: API_BASE_URL,
  defaultTimeout: 30000, // 30 seconds
  maxRetries: 1,
  staleTime: 5 * 60 * 1000, // 5 minutes
};

export default config;