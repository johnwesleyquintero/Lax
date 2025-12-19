import React, { useState, useEffect } from 'react';
import { Channel, User } from './types';
import { APP_CONFIG } from './constants';
import { api } from './services/gas';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import LoginScreen from './components/LoginScreen';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Restore session
  useEffect(() => {
    const storedUser = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CURRENT_USER);
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoadingInitial(false);
  }, []);

  // Fetch Metadata (Channels, Users)
  useEffect(() => {
    if (!currentUser) return;

    const loadMetadata = async () => {
      try {
        const [fetchedChannels, fetchedUsers] = await Promise.all([
            api.getChannels(),
            api.getUsers()
        ]);
        setChannels(fetchedChannels);
        setUsers(fetchedUsers);
        
        // Select first channel if none selected
        if (fetchedChannels.length > 0 && !currentChannelId) {
            setCurrentChannelId(fetchedChannels[0].channel_id);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    };

    loadMetadata();
  }, [currentUser, currentChannelId]);

  const handleLogout = () => {
    localStorage.removeItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CURRENT_USER);
    setCurrentUser(null);
    setCurrentChannelId('');
  };

  const handleChannelCreated = (newChannel: Channel) => {
    setChannels(prev => [...prev, newChannel]);
    setCurrentChannelId(newChannel.channel_id);
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        onChannelCreated={handleChannelCreated}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {currentChannel ? (
            <ChatWindow 
                channel={currentChannel}
                currentUser={currentUser}
                users={users}
            />
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a channel to begin operations.
            </div>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
};

export default App;