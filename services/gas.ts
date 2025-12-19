import { User, Channel, Message, ApiResponse, APP_CONFIG } from '../types';

/**
 * Service to handle communication with Google Apps Script or Local Mock.
 * This pattern allows the frontend to be completely sovereign from the backend implementation.
 */
class GasService {
  private useMock: boolean;
  private apiUrl: string;

  constructor() {
    this.useMock = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USE_MOCK) !== 'false'; // Default to true
    this.apiUrl = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.API_URL) || '';
    
    // Initialize mock data if empty and using mock
    if (this.useMock) {
      this.initMockData();
    }
  }

  public setConfig(useMock: boolean, apiUrl: string) {
    this.useMock = useMock;
    this.apiUrl = apiUrl;
    localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USE_MOCK, String(useMock));
    localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.API_URL, apiUrl);
    if (useMock) this.initMockData();
  }

  public getConfig() {
    return { useMock: this.useMock, apiUrl: this.apiUrl };
  }

  // --- Public API Methods ---

  public async getChannels(): Promise<Channel[]> {
    if (this.useMock) return this.mockGetChannels();
    return this.fetchGas<Channel[]>('getChannels');
  }

  public async getMessages(channelId: string, afterTs?: string): Promise<Message[]> {
    if (this.useMock) return this.mockGetMessages(channelId, afterTs);
    return this.fetchGas<Message[]>('getMessages', { channelId, afterTs });
  }

  public async sendMessage(channelId: string, userId: string, content: string): Promise<Message> {
    if (this.useMock) return this.mockSendMessage(channelId, userId, content);
    return this.fetchGas<Message>('sendMessage', { channelId, userId, message: content });
  }

  public async getUsers(): Promise<User[]> {
    if (this.useMock) return this.mockGetUsers();
    return this.fetchGas<User[]>('getUsers');
  }

  public async createUser(email: string, displayName: string): Promise<User> {
    if (this.useMock) return this.mockCreateUser(email, displayName);
    return this.fetchGas<User>('createUser', { email, displayName });
  }

  // --- Internal GAS Fetcher ---

  private async fetchGas<T>(action: string, payload: any = {}): Promise<T> {
    if (!this.apiUrl) {
      throw new Error("API URL not configured.");
    }

    try {
      // In a real GAS 'doPost', usually we send data as a stringified body
      // We might need 'no-cors' if just triggering, but for reading we need CORS enabled on GAS script.
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // GAS often prefers text/plain to avoid preflight options
        },
        body: JSON.stringify({ action, payload }),
      });

      const json: ApiResponse<T> = await response.json();
      if (json.status === 'error') {
        throw new Error(json.message || 'Unknown GAS Error');
      }
      return json.data as T;
    } catch (error) {
      console.error(`GAS Error [${action}]:`, error);
      throw error;
    }
  }

  // --- Mock Implementation (Local Storage) ---

  private initMockData() {
    if (!localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS)) {
      const initialChannels: Channel[] = [
        { channel_id: 'c_general', channel_name: 'general', is_private: false, created_by: 'system', created_at: new Date().toISOString() },
        { channel_id: 'c_random', channel_name: 'random', is_private: false, created_by: 'system', created_at: new Date().toISOString() },
        { channel_id: 'c_ops', channel_name: 'operations', is_private: true, created_by: 'system', created_at: new Date().toISOString() },
      ];
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS, JSON.stringify(initialChannels));
    }
    if (!localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    }
    if (!localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS)) {
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS, JSON.stringify([]));
    }
  }

  private mockGetChannels(): Promise<Channel[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS);
        resolve(data ? JSON.parse(data) : []);
      }, 300); // Fake latency
    });
  }

  private mockGetMessages(channelId: string, afterTs?: string): Promise<Message[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const allMessages: Message[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES) || '[]');
        const filtered = allMessages.filter(m => 
          m.channel_id === channelId && 
          (!afterTs || new Date(m.created_at) > new Date(afterTs))
        );
        resolve(filtered);
      }, 300);
    });
  }

  private mockSendMessage(channelId: string, userId: string, content: string): Promise<Message> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const allMessages: Message[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES) || '[]');
        const newMessage: Message = {
          message_id: 'msg_' + Date.now() + Math.random().toString(36).substr(2, 9),
          channel_id: channelId,
          user_id: userId,
          content: content,
          created_at: new Date().toISOString()
        };
        allMessages.push(newMessage);
        localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES, JSON.stringify(allMessages));
        resolve(newMessage);
      }, 200);
    });
  }

  private mockGetUsers(): Promise<User[]> {
    return new Promise((resolve) => {
      const users = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS) || '[]');
      resolve(users);
    });
  }

  private mockCreateUser(email: string, displayName: string): Promise<User> {
    return new Promise((resolve) => {
      const users: User[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS) || '[]');
      const existing = users.find(u => u.email === email);
      if (existing) {
        resolve(existing);
        return;
      }
      const newUser: User = {
        user_id: 'u_' + Date.now(),
        email,
        display_name: displayName,
        role: 'member',
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));
      resolve(newUser);
    });
  }
}

export const api = new GasService();