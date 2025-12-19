// Centralized configuration for the application
export const APP_CONFIG = {
  // Polling frequency for fetching new messages
  POLL_INTERVAL_MS: 3000,
  
  // Google OAuth Client ID
  GOOGLE_CLIENT_ID: '408818190066-66mpmibsibbj6qasm1i405esof76hrnj.apps.googleusercontent.com',
  
  // The deployed Google Apps Script Web App URL
  DEFAULT_API_URL: 'https://script.google.com/macros/s/AKfycbzERwiU_Cd0zNvQ1tyPlNtMHX6QYYfG3ND1z9iavY6vxmhP3oPaRsIG_MRttEkf7WUJ/exec',
  
  // Local Storage Keys
  LOCAL_STORAGE_KEYS: {
    USERS: 'op_chat_users',
    CHANNELS: 'op_chat_channels',
    MESSAGES: 'op_chat_messages',
    CURRENT_USER: 'op_chat_current_user',
    API_URL: 'op_chat_api_url',
    USE_MOCK: 'op_chat_use_mock'
  }
};