export interface User {
  user_id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'member';
  created_at: string;
  last_active: string;
}

export interface Channel {
  channel_id: string;
  channel_name: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
}

export interface Message {
  message_id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

// Configuration for the app
export const APP_CONFIG = {
  POLL_INTERVAL_MS: 3000,
  GOOGLE_CLIENT_ID: '408818190066-66mpmibsibbj6qasm1i405esof76hrnj.apps.googleusercontent.com',
  LOCAL_STORAGE_KEYS: {
    USERS: 'op_chat_users',
    CHANNELS: 'op_chat_channels',
    MESSAGES: 'op_chat_messages',
    CURRENT_USER: 'op_chat_current_user',
    API_URL: 'op_chat_api_url',
    USE_MOCK: 'op_chat_use_mock'
  }
};