import React, { useState } from 'react';
import { Channel, User } from '../types';
import CreateDMModal from './CreateDMModal';

interface DirectMessageListProps {
  channels: Channel[];
  users: User[];
  currentUser: User;
  currentChannelId: string;
  onSelectChannel: (id: string) => void;
  isCollapsed: boolean;
  searchQuery: string;
  onChannelCreated: (channel: Channel) => void;
}

const DirectMessageList: React.FC<DirectMessageListProps> = ({
  channels,
  users,
  currentUser,
  currentChannelId,
  onSelectChannel,
  isCollapsed,
  searchQuery,
  onChannelCreated
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Helper to resolve DM metadata
  const getDMInfo = (channel: Channel) => {
    // DM naming convention: dm_uidA_uidB
    const parts = channel.channel_name.split('_');
    // Filter out 'dm' and my own ID
    const otherId = parts.filter(p => p !== 'dm' && p !== currentUser.user_id)[0];
    
    // If found, look up user
    if (otherId) {
        const otherUser = users.find(u => u.user_id === otherId);
        if (otherUser) {
            return { name: otherUser.display_name, avatar: otherUser.display_name[0], user: otherUser };
        }
    }
    return { name: 'Unknown', avatar: '?', user: null };
  };

  // Filter channels to only DMs
  const dmChannels = channels.filter(c => c.type === 'dm');

  // Filter by search query
  const filteredDMs = dmChannels.filter(c => {
    const { name } = getDMInfo(c);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Deterministic color
  const getColor = (str: string) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <>
      <div className={`px-4 mb-2 flex items-center group transition-all ${isCollapsed ? 'flex-col gap-3 mt-4' : 'justify-between'}`}>
        {!isCollapsed && <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-400">Direct Messages</h2>}
        <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col w-full' : ''}`}>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className={`text-slate-500 hover:text-slate-300 transition-colors hover:bg-slate-800 rounded ${isCollapsed ? 'p-2 w-10 h-10 flex items-center justify-center' : 'p-1'}`} 
              title="New Direct Message"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
        </div>
      </div>

      <ul className={`space-y-0.5 ${isCollapsed ? 'px-2' : ''}`}>
          {filteredDMs.length === 0 && searchQuery && !isCollapsed && (
              <li className="px-4 py-2 text-xs text-slate-600 italic">No operators match</li>
          )}
          {filteredDMs.map((channel) => {
              const isActive = channel.channel_id === currentChannelId;
              const { name, avatar } = getDMInfo(channel);
              return (
                  <li key={channel.channel_id}>
                      <button
                          onClick={() => onSelectChannel(channel.channel_id)}
                          title={isCollapsed ? name : undefined}
                          className={`w-full flex items-center transition-colors rounded ${
                              isCollapsed 
                                  ? 'justify-center h-10 w-10 mx-auto' 
                                  : 'text-left px-4 py-1.5'
                          } ${
                              isActive 
                                  ? 'bg-blue-700 text-white' 
                                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                      >
                          {/* Avatar for DM */}
                          <div className={`flex-shrink-0 flex items-center justify-center rounded text-[10px] font-bold ${isCollapsed ? 'w-6 h-6 text-sm' : 'w-4 h-4 mr-2'} ${getColor(name)} text-white`}>
                              {avatar}
                          </div>
                          
                          {!isCollapsed && (
                              <span className={`truncate ${isActive ? 'font-medium' : ''}`}>
                                  {name}
                              </span>
                          )}
                      </button>
                  </li>
              );
          })}
      </ul>

      {isCreateModalOpen && (
        <CreateDMModal 
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={onChannelCreated}
          currentUser={currentUser}
          users={users}
        />
      )}
    </>
  );
};

export default DirectMessageList;