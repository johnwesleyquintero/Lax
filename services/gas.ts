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
    if (this.useMock) return this.mockCreateChannel(name, isPrivate, creatorId, 'channel');
    return this.fetchGas<Channel>('createChannel', { name, isPrivate, creatorId, type: 'channel' });
  }

  public async updateChannel(channelId: string, name: string, isPrivate: boolean): Promise<Channel> {
    if (this.useMock) return this.mockUpdateChannel(channelId, name, isPrivate);
    return this.fetchGas<Channel>('updateChannel', { channelId, name, isPrivate });
  }

  public async deleteChannel(channelId: string): Promise<void> {
    if (this.useMock) return this.mockDeleteChannel(channelId);
    return this.fetchGas<void>('deleteChannel', { channelId });
  }

  public async createDM(targetUserId: string, currentUserId: string): Promise<Channel> {
    // Generate deterministic DM name: dm_userA_userB (sorted)
    const sortedIds = [targetUserId, currentUserId].sort();
    const dmName = `dm_${sortedIds[0]}_${sortedIds[1]}`;

    if (this.useMock) return this.mockCreateDM(dmName, currentUserId, targetUserId);
    return this.fetchGas<Channel>('createDM', { name: dmName, isPrivate: true, creatorId: currentUserId, targetUserId });
  }

  public async joinChannel(channelId: string, userId: string): Promise<void> {
    if (this.useMock) return this.mockJoinChannel(channelId, userId);
    return this.fetchGas<void>('joinChannel', { channelId, userId });
  }

  public async getMessages(channelId: string, afterTs?: string, limit: number = 100): Promise<Message[]> {
    if (this.useMock) return this.mockGetMessages(channelId, afterTs, limit);
    return this.fetchGas<Message[]>('getMessages', { channelId, afterTs, limit });
  }

  public async sendMessage(channelId: string, userId: string, content: string): Promise<Message> {
    if (this.useMock) return this.mockSendMessage(channelId, userId, content);
    return this.fetchGas<Message>('sendMessage', { channelId, userId, message: content });
  }

  public async editMessage(messageId: string, content: string): Promise<void> {
    if (this.useMock) return this.mockEditMessage(messageId, content);
    return this.fetchGas<void>('editMessage', { messageId, content });
  }

  public async deleteMessage(messageId: string): Promise<void> {
    if (this.useMock) return this.mockDeleteMessage(messageId);
    return this.fetchGas<void>('deleteMessage', { messageId });
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

  private async fetchGas<T>(action: string, payload: any = {}, retries = 2): Promise<T> {
    if (!this.apiUrl) {
      throw new Error("Configuration missing. Please go to Config > Enter your GAS Web App URL.");
    }

    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8', 
          },
          body: JSON.stringify({ action, payload }),
        });

        const text = await response.text();
        let json: ApiResponse<T>;

        try {
            json = JSON.parse(text);
        } catch (e) {
            // Check for HTML error response (common with GAS timeouts/errors)
            if (text.trim().startsWith('<')) {
                const titleMatch = text.match(/<title>(.*?)<\/title>/);
                const title = titleMatch ? titleMatch[1] : 'Unknown Server Error';
                throw new Error(`Server Error: ${title}`);
            }
            throw new Error(`Malformed JSON response: ${text.slice(0, 100)}`);
        }
        
        if (json.status === 'error') {
          if (json.message && json.message.includes('Unknown action')) {
              throw new Error(`Backend Outdated: The server does not support '${action}'. Please redeploy your Google Apps Script.`);
          }
          throw new Error(json.message || 'Unknown GAS Error');
        }

        return json.data as T;

      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed for ${action}:`, error);
        lastError = error;
        
        // Don't retry if it's a configuration error
        if (error instanceof Error && error.message.includes('Configuration missing')) {
            throw error;
        }

        if (attempt < retries) {
            // Exponential backoff: 500ms, 1000ms, etc.
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError;
  }

  // --- Mock Implementation (Local Storage) ---

  private initMockData() {
    // 1. Channels
    if (!localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS)) {
      const initialChannels: Channel[] = [
        { channel_id: 'c_general', channel_name: 'general', is_private: false, created_by: 'system', created_at: new Date().toISOString(), type: 'channel' },
        { channel_id: 'c_random', channel_name: 'random', is_private: false, created_by: 'system', created_at: new Date().toISOString(), type: 'channel' },
        { channel_id: 'c_ops', channel_name: 'operations', is_private: true, created_by: 'system', created_at: new Date().toISOString(), type: 'channel' },
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
    const MEMBERS_KEY = 'op_chat_channel_members';
    if (!localStorage.getItem(MEMBERS_KEY)) {
      const channels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
      const users: User[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.USERS) || '[]');
      
      const members: any[] = [];
      
      // Auto-join logic for initial seed
      channels.forEach(c => {
        users.forEach(u => {
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
        const allMessages: Message[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES) || '[]');

        // Filter channels where user is a member
        const myChannelIds = new Set(members.filter((m: any) => m.user_id === userId).map((m: any) => m.channel_id));
        const myChannels = allChannels.filter(c => myChannelIds.has(c.channel_id));

        // Attach last_message_at
        const channelsWithStats = myChannels.map(c => {
            const channelMessages = allMessages.filter(m => m.channel_id === c.channel_id);
            if (channelMessages.length > 0) {
                // Assuming messages are roughly order, but let's be safe
                const lastMsg = channelMessages[channelMessages.length - 1];
                return { ...c, last_message_at: lastMsg.created_at };
            }
            return c;
        });
        
        resolve(channelsWithStats);
      }, 300);
    });
  }

  private mockGetBrowsableChannels(userId: string): Promise<Channel[]> {
    return new Promise((resolve) => {
        setTimeout(() => {
          const allChannels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
          const members: any[] = JSON.parse(localStorage.getItem('op_chat_channel_members') || '[]');
          
          const myChannelIds = new Set(members.filter((m: any) => m.user_id === userId).map((m: any) => m.channel_id));
          
          // Return Public channels that I am NOT a member of AND exclude DMs
          const browsable = allChannels.filter(c => !c.is_private && c.type !== 'dm' && !myChannelIds.has(c.channel_id));
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

  private mockCreateChannel(name: string, isPrivate: boolean, creatorId: string, type: 'channel' | 'dm'): Promise<Channel> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const channels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
        
        const slug = name.toLowerCase().replace(/[^a-z0-9_]/g, '-');
        
        const newChannel: Channel = {
          channel_id: 'c_' + slug + '_' + Date.now().toString().slice(-4),
          channel_name: slug,
          is_private: isPrivate,
          created_by: creatorId,
          created_at: new Date().toISOString(),
          type: type
        };
        
        channels.push(newChannel);
        localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS, JSON.stringify(channels));

        const members: any[] = JSON.parse(localStorage.getItem('op_chat_channel_members') || '[]');
        members.push({ channel_id: newChannel.channel_id, user_id: creatorId, joined_at: new Date().toISOString() });
        localStorage.setItem('op_chat_channel_members', JSON.stringify(members));

        resolve(newChannel);
      }, 400);
    });
  }

  private mockUpdateChannel(channelId: string, name: string, isPrivate: boolean): Promise<Channel> {
      return new Promise((resolve, reject) => {
          setTimeout(() => {
              const channels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
              const index = channels.findIndex(c => c.channel_id === channelId);
              
              if (index === -1) {
                  reject("Channel not found");
                  return;
              }

              const slug = name.toLowerCase().replace(/[^a-z0-9_]/g, '-');
              channels[index] = { ...channels[index], channel_name: slug, is_private: isPrivate };
              
              localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS, JSON.stringify(channels));
              resolve(channels[index]);
          }, 400);
      });
  }

  private mockDeleteChannel(channelId: string): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            let channels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
            channels = channels.filter(c => c.channel_id !== channelId);
            localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS, JSON.stringify(channels));
            
            let members: any[] = JSON.parse(localStorage.getItem('op_chat_channel_members') || '[]');
            members = members.filter(m => m.channel_id !== channelId);
            localStorage.setItem('op_chat_channel_members', JSON.stringify(members));

            resolve();
        }, 400);
    });
  }

  private mockCreateDM(name: string, currentUserId: string, targetUserId: string): Promise<Channel> {
      return new Promise((resolve) => {
        setTimeout(() => {
            const channels: Channel[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS) || '[]');
            
            const existing = channels.find(c => c.channel_name === name && c.type === 'dm');
            if (existing) {
                resolve(existing);
                return;
            }

            const newChannel: Channel = {
                channel_id: 'dm_' + Date.now() + Math.random().toString(36).substr(2, 5),
                channel_name: name,
                is_private: true,
                created_by: currentUserId,
                created_at: new Date().toISOString(),
                type: 'dm'
            };

            channels.push(newChannel);
            localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CHANNELS, JSON.stringify(channels));

            const members: any[] = JSON.parse(localStorage.getItem('op_chat_channel_members') || '[]');
            members.push({ channel_id: newChannel.channel_id, user_id: currentUserId, joined_at: new Date().toISOString() });
            members.push({ channel_id: newChannel.channel_id, user_id: targetUserId, joined_at: new Date().toISOString() });
            localStorage.setItem('op_chat_channel_members', JSON.stringify(members));

            resolve(newChannel);
        }, 400);
      });
  }

  private mockGetMessages(channelId: string, afterTs?: string, limit: number = 100): Promise<Message[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const allMessages: Message[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES) || '[]');
        
        let filtered = allMessages.filter(m => 
          m.channel_id === channelId && 
          (!afterTs || new Date(m.created_at) > new Date(afterTs))
        );

        // Sort by Time Ascending (Oldest First) - standard for chat
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Apply Limit: If no afterTs (initial load), take the last N. 
        // If afterTs is present, we usually want ALL updates, but let's respect limit for safety
        if (filtered.length > limit) {
             filtered = filtered.slice(filtered.length - limit);
        }
        
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

  private mockEditMessage(messageId: string, content: string): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const allMessages: Message[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES) || '[]');
            const index = allMessages.findIndex(m => m.message_id === messageId);
            if (index !== -1) {
                allMessages[index].content = content;
                localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES, JSON.stringify(allMessages));
            }
            resolve();
        }, 200);
    });
  }

  private mockDeleteMessage(messageId: string): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            let allMessages: Message[] = JSON.parse(localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES) || '[]');
            allMessages = allMessages.filter(m => m.message_id !== messageId);
            localStorage.setItem(APP_CONFIG.LOCAL_STORAGE_KEYS.MESSAGES, JSON.stringify(allMessages));
            resolve();
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