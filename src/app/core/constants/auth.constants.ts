export const PUBLIC_ENDPOINTS = {
  LOGIN: '/users/login',
  SIGNUP: '/users/signup',
  REFRESH: '/users/refresh-token'
};

export const AUTH_ENDPOINTS = {
  LOGOUT: '/users/logout',
  REFRESH: '/users/refresh-token',  // Add this
  LOGIN: '/users/login',            // Add this
  SIGNUP: '/users/signup'           // Add this
};

export const AUTH_ERRORS = {
  REFRESH_FAILED: 'Token refresh failed',
  UNAUTHORIZED: 'Unauthorized access',
  SESSION_EXPIRED: 'Session expired',
  TOKEN_INVALID: 'Invalid token format',
  STORAGE_ERROR: 'Token storage failed',
  NETWORK_ERROR: 'Network request failed',
  MAX_RETRIES_EXCEEDED: 'Maximum refresh retries exceeded'
};

export const AUTH_CONFIG = {
  TOKEN_REFRESH_INTERVAL: 840000,  // 14 minutes
  SESSION_TIMEOUT: 3600000,        // 1 hour
  INITIAL_REFRESH_DELAY: 5000,     // 5 seconds
  MAX_REFRESH_RETRIES: 3
};

export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  EXPIRY: 'token_expiry'
};

export const AUTH_STATE = {
  REFRESHING: 'refreshing',
  AUTHENTICATING: 'authenticating',
  IDLE: 'idle'
};

export const AUTH_LOCKS = {
  REFRESH_LOCK_TIMEOUT: 10000,  // 10 seconds
  RETRY_BACKOFF: 1000          // 1 second
};