import { User, Channel, Message, ApiResponse } from '../types';
import { APP_CONFIG } from '../constants';

/**
 * Service to handle communication with Google Apps Script or Local Mock.
 * This pattern allows the frontend to be completely sovereign from the backend implementation.
 */
class GasService {
  private useMock: boolean;
  private apiUrl: string;

  constructor() {
    this.useMock = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USE_MOCK) !== 'false'; // Default to true
    // Use stored URL or fall back to the default constant
    this.apiUrl = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.API_URL) || APP_CONFIG.DEFAULT_API_URL;
    
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

  public async getChannels(userId: string): Promise<Channel[]> {
    if (this.useMock) return this.mockGetChannels(userId);
    return this.fetchGas<Channel[]>('getChannels', { userId });
  }

  public async getBrowsableChannels(userId: string): Promise<Channel[]> {
    if (this.useMock) return this.mockGetBrowsableChannels(userId);
    return this.fetchGas<Channel[]>('getBrowsableChannels', { userId });
  }

  public async createChannel(name: string, isPrivate: boolean, creatorId: string): Promise<Channel> {
    if (this.useMock) return this.mockCreateChannel(name, isPrivate, creatorId);
    return this.fetchGas<Channel>('createChannel', { name, isPrivate, creatorId });
  }

  public async joinChannel(channelId: string, userId: string): Promise<void> {
    if (this.useMock) return this.mockJoinChannel(channelId, userId);
    return this.fetchGas<void>('joinChannel', { channelId, userId });
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
    // 1. Channels
    if (!localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS)) {
      const initialChannels: Channel[] = [
        { channel_id: 'c_general', channel_name: 'general', is_private: false, created_by: 'system', created_at: new Date().toISOString() },
        { channel_id: 'c_random', channel_name: 'random', is_private: false, created_by: 'system', created_at: new Date().toISOString() },
        { channel_id: 'c_ops', channel_name: 'operations', is_private: true, created_by: 'system', created_at: new Date().toISOString() },
      ];
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS, JSON.stringify(initialChannels));
    }
    
    // 2. Users
    if (!localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS)) {
      const dummyUsers: User[] = [
        { user_id: 'u_sys_1', email: 'admin@lax.hq', display_name: 'System', role: 'admin', created_at: new Date().toISOString(), last_active: new Date().toISOString(), job_title: 'Bot', status: 'Monitoring uplink...' },
        { user_id: 'u_demo_1', email: 'viper@topgun.nav', display_name: 'Viper', role: 'member', created_at: new Date().toISOString(), last_active: new Date().toISOString(), job_title: 'Instructor', status: 'In the tower.' },
      ];
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS, JSON.stringify(dummyUsers));
    }

    // 3. Channel Members (New)
    // If not exists, seed it by adding all current users to all current public channels to migrate
    const MEMBERS_KEY = 'op_chat_channel_members';
    if (!localStorage.getItem(MEMBERS_KEY)) {
      const channels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
      const users: User[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS) || '[]');
      
      const members: any[] = [];
      
      // Auto-join logic for initial seed
      channels.forEach(c => {
        users.forEach(u => {
             // Add everyone to public channels, add system/admin to private ops
             if (!c.is_private || c.channel_name === 'operations') {
                 members.push({ channel_id: c.channel_id, user_id: u.user_id, joined_at: new Date().toISOString() });
             }
        });
      });
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
    }

    if (!localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    }
  }

  private mockGetChannels(userId: string): Promise<Channel[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const allChannels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
        const members: any[] = JSON.parse(localStorage.getItem('op_chat_channel_members') || '[]');
        
        // Filter channels where user is a member
        const myChannelIds = new Set(members.filter((m: any) => m.user_id === userId).map((m: any) => m.channel_id));
        const myChannels = allChannels.filter(c => myChannelIds.has(c.channel_id));
        
        resolve(myChannels);
      }, 300);
    });
  }

  private mockGetBrowsableChannels(userId: string): Promise<Channel[]> {
    return new Promise((resolve) => {
        setTimeout(() => {
          const allChannels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
          const members: any[] = JSON.parse(localStorage.getItem('op_chat_channel_members') || '[]');
          
          const myChannelIds = new Set(members.filter((m: any) => m.user_id === userId).map((m: any) => m.channel_id));
          
          // Return Public channels that I am NOT a member of
          const browsable = allChannels.filter(c => !c.is_private && !myChannelIds.has(c.channel_id));
          resolve(browsable);
        }, 300);
    });
  }

  private mockJoinChannel(channelId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const allChannels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
            const channel = allChannels.find(c => c.channel_id === channelId);
            
            if (!channel) {
                reject("Channel not found");
                return;
            }

            const members: any[] = JSON.parse(localStorage.getItem('op_chat_channel_members') || '[]');
            const isMember = members.some((m: any) => m.channel_id === channelId && m.user_id === userId);
            
            if (!isMember) {
                members.push({ channel_id: channelId, user_id: userId, joined_at: new Date().toISOString() });
                localStorage.setItem('op_chat_channel_members', JSON.stringify(members));
            }
            resolve();
        }, 300);
    });
  }

  private mockCreateChannel(name: string, isPrivate: boolean, creatorId: string): Promise<Channel> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const channels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
        
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        const newChannel: Channel = {
          channel_id: 'c_' + slug + '_' + Date.now().toString().slice(-4),
          channel_name: slug,
          is_private: isPrivate,
          created_by: creatorId,
          created_at: new Date().toISOString()
        };
        
        channels.push(newChannel);
        localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS, JSON.stringify(channels));

        // Auto-join the creator
        const members: any[] = JSON.parse(localStorage.getItem('op_chat_channel_members') || '[]');
        members.push({ channel_id: newChannel.channel_id, user_id: creatorId, joined_at: new Date().toISOString() });
        localStorage.setItem('op_chat_channel_members', JSON.stringify(members));

        resolve(newChannel);
      }, 400);
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
        last_active: new Date().toISOString(),
        status: 'Online',
        job_title: 'Operator'
      };
      users.push(newUser);
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));

      // Auto join 'general'
      const members: any[] = JSON.parse(localStorage.getItem('op_chat_channel_members') || '[]');
      const channels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
      const general = channels.find(c => c.channel_name === 'general');
      
      if (general) {
          members.push({ channel_id: general.channel_id, user_id: newUser.user_id, joined_at: new Date().toISOString() });
          localStorage.setItem('op_chat_channel_members', JSON.stringify(members));
      }

      resolve(newUser);
    });
  }
}

export const api = new GasService();