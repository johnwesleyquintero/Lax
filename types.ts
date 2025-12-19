export interface User {
  user_id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'member';
  created_at: string;
  last_active: string;
  status?: string;
  job_title?: string;
}

export interface Channel {
  channel_id: string;
  channel_name: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
  type?: 'channel' | 'dm'; // New field
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