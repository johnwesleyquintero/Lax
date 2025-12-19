import React, { useState } from 'react';
import { Channel, User } from '../types';
import CreateChannelModal from './CreateChannelModal';
import JoinChannelModal from './JoinChannelModal';

interface SidebarProps {
  channels: Channel[];
  currentChannelId: string;
  onSelectChannel: (id: string) => void;
  currentUser: User;
  onOpenSettings: () => void;
  onLogout: () => void;
  onChannelCreated: (channel: Channel) => void;
  onUserClick: (user: User) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  channels, 
  currentChannelId, 
  onSelectChannel, 
  currentUser,
  onOpenSettings,
  onLogout,
  onChannelCreated,
  onUserClick
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const handleChannelJoined = (channelId: string) => {
      // Logic for joining is handled in App.tsx via reloading channels, 
      // but if we need immediate navigation we can use this.
      // For now, we rely on App.tsx to refresh the channel list.
      onSelectChannel(channelId); // Optimistically select it
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 flex-shrink-0">
      {/* Workspace Header */}
      <div className="p-4 border-b border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer group flex items-center gap-3">
        {/* Tiny Logo */}
        <div className="w-8 h-8 flex-shrink-0">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="24" fill="#1e293b"/> {/* Lighter slate for contrast on dark sidebar */}
            <path d="M28 24H48V56H28z" fill="#3b82f6"/>
            <path d="M28 56H72V76H28z" fill="#60a5fa"/>
            <circle cx="72" cy="34" r="6" fill="#22c55e"/>
          </svg>
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight truncate">Lax</h1>
          <button 
             onClick={() => onUserClick(currentUser)}
             className="flex items-center text-xs opacity-70 hover:opacity-100 transition-opacity"
          >
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
             <span className="truncate max-w-[120px]">{currentUser.display_name}</span>
          </button>
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2 flex items-center justify-between group">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-400">Channels</h2>
          <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsJoinModalOpen(true)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1 hover:bg-slate-800 rounded" 
                title="Browse Channels"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1 hover:bg-slate-800 rounded" 
                title="Create Channel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
          </div>
        </div>
        
        <ul className="space-y-0.5">
          {channels.map((channel) => {
            const isActive = channel.channel_id === currentChannelId;
            return (
              <li key={channel.channel_id}>
                <button
                  onClick={() => onSelectChannel(channel.channel_id)}
                  className={`w-full text-left px-4 py-1.5 flex items-center transition-colors ${
                    isActive 
                      ? 'bg-blue-700 text-white' 
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-opacity-70 mr-2 text-lg leading-none opacity-60">
                    {channel.is_private ? '🔒' : '#'}
                  </span>
                  <span className={`truncate ${isActive ? 'font-medium' : ''}`}>
                    {channel.channel_name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer / Settings */}
      <div className="p-3 bg-slate-950 border-t border-slate-900">
        <div className="flex items-center justify-between">
           <button 
             onClick={onOpenSettings}
             className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
             Config
           </button>
           <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-300">
             Sign Out
           </button>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateChannelModal 
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={onChannelCreated}
          currentUser={currentUser}
        />
      )}
      
      {isJoinModalOpen && (
        <JoinChannelModal
            onClose={() => setIsJoinModalOpen(false)}
            onJoined={(id) => onChannelCreated({ channel_id: id } as any)} // Hack: Reuse trigger to refresh list
            currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default Sidebar;