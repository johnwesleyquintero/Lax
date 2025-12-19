import React, { useState, useEffect, useCallback } from 'react';
import { Channel, User } from './types';
import { APP_CONFIG } from './constants';
import { api } from './services/gas';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import LoginScreen from './components/LoginScreen';
import SettingsModal from './components/SettingsModal';
import UserProfileModal from './components/UserProfileModal';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Restore session
  useEffect(() => {
    const storedUser = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CURRENT_USER);
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoadingInitial(false);
  }, []);

  const loadMetadata = useCallback(async () => {
      if (!currentUser) return;
      try {
        const [fetchedChannels, fetchedUsers] = await Promise.all([
            api.getChannels(currentUser.user_id),
            api.getUsers()
        ]);
        setChannels(fetchedChannels);
        setUsers(fetchedUsers);
        
        // Select first channel if none selected
        if (fetchedChannels.length > 0 && !currentChannelId) {
            // Prefer 'general' if exists, otherwise first
            const general = fetchedChannels.find(c => c.channel_name === 'general');
            setCurrentChannelId(general ? general.channel_id : fetchedChannels[0].channel_id);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
  }, [currentUser, currentChannelId]);

  // Fetch Metadata (Channels, Users)
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const handleLogout = () => {
    localStorage.removeItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CURRENT_USER);
    setCurrentUser(null);
    setCurrentChannelId('');
  };

  // Called when Create or Join happens.
  // Ideally, JoinChannelModal should pass the full object, but sometimes we just reload.
  // We reload metadata to be safe and consistent.
  const refreshChannels = async () => {
      if (currentUser) {
          const fetchedChannels = await api.getChannels(currentUser.user_id);
          setChannels(fetchedChannels);
      }
  };

  const handleChannelAction = (newChannel: Channel) => {
    // If it's a partial object (hack from Sidebar), reload all
    if (!newChannel.channel_name) {
        refreshChannels().then(() => {
             setCurrentChannelId(newChannel.channel_id);
        });
    } else {
        // Optimistic add for create or update
        setChannels(prev => {
            const index = prev.findIndex(c => c.channel_id === newChannel.channel_id);
            if (index !== -1) {
                // Update
                const newArr = [...prev];
                newArr[index] = newChannel;
                return newArr;
            }
            // Add
            return [...prev, newChannel];
        });
        setCurrentChannelId(newChannel.channel_id);
    }
  };

  const handleChannelDeleted = () => {
      refreshChannels().then(() => {
          // Reset to general or empty
          const general = channels.find(c => c.channel_name === 'general');
          setCurrentChannelId(general ? general.channel_id : '');
      });
  };

  if (loadingInitial) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-gray-400">Initializing...</div>;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  const currentChannel = channels.find(c => c.channel_id === currentChannelId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <Sidebar 
        channels={channels}
        currentChannelId={currentChannelId}
        onSelectChannel={setCurrentChannelId}
        currentUser={currentUser}
        users={users} // Pass users down for DM resolution
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        onChannelCreated={handleChannelAction}
        onUserClick={setSelectedUser}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {currentChannel ? (
            <ChatWindow 
                channel={currentChannel}
                currentUser={currentUser}
                users={users}
                onUserClick={setSelectedUser}
                onChannelDeleted={handleChannelDeleted}
                onChannelUpdated={handleChannelAction}
            />
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                {channels.length === 0 ? 'You are not in any channels. Use search to join one.' : 'Select a channel to begin operations.'}
            </div>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {selectedUser && (
        <UserProfileModal 
          user={selectedUser} 
          currentUser={currentUser}
          onClose={() => setSelectedUser(null)} 
        />
      )}
    </div>
  );
};

export default App;