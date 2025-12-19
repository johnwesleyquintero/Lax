import React, { useState, useEffect } from 'react';
import { Channel, User } from '../types';
import CreateChannelModal from './CreateChannelModal';
import JoinChannelModal from './JoinChannelModal';
import DirectMessageList from './DirectMessageList';

interface SidebarProps {
  channels: Channel[];
  currentChannelId: string;
  onSelectChannel: (id: string) => void;
  currentUser: User;
  users: User[]; // Needed to resolve DM names
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
  users,
  onOpenSettings,
  onLogout,
  onChannelCreated,
  onUserClick
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Clear search when collapsed to ensure icon view is complete
  useEffect(() => {
    if (isCollapsed) {
        setSearchQuery('');
    }
  }, [isCollapsed]);

  // Group Channels
  const groupChannels = channels.filter(c => !c.type || c.type === 'channel');

  // Filter Logic for Groups
  const filteredGroupChannels = groupChannels.filter(c => 
    c.channel_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className={`${isCollapsed ? 'w-[72px]' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 flex-shrink-0 transition-all duration-300 ease-in-out relative`}
    >
       {/* Toggle Button */}
       <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-7 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white cursor-pointer z-20 shadow-sm hover:scale-110 transition-all"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             {isCollapsed ? (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
             ) : (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
             )}
        </svg>
      </button>

      {/* Workspace Header */}
      <div 
        onClick={() => isCollapsed && onUserClick(currentUser)}
        className={`p-4 border-b border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer group flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : ''}`}
        title="Open Profile"
      >
        {/* Tiny Logo */}
        <div className="w-8 h-8 flex-shrink-0">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="24" fill="#1e293b"/>
            <path d="M28 24H48V56H28z" fill="#3b82f6"/>
            <path d="M28 56H72V76H28z" fill="#60a5fa"/>
            <circle cx="72" cy="34" r="6" fill="#22c55e"/>
          </svg>
        </div>
        
        {/* Text Info */}
        <div className={`overflow-hidden transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 h-0 hidden' : 'opacity-100'}`}>
          <h1 className="text-white font-bold text-lg leading-tight truncate">Lax</h1>
          <button 
             onClick={(e) => { e.stopPropagation(); onUserClick(currentUser); }}
             className="flex items-center text-xs opacity-70 hover:opacity-100 transition-opacity"
          >
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
             <span className="truncate max-w-[120px]">{currentUser.display_name}</span>
          </button>
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        
        {/* Search Bar */}
        {!isCollapsed && (
          <div className="px-4 mb-4">
             <div className="relative group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Jump to..."
                  className="w-full bg-slate-950 text-slate-300 placeholder-slate-600 text-sm rounded border border-slate-800 px-3 py-1.5 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
          </div>
        )}

        {/* Group Channels Section */}
        <div className={`px-4 mb-2 flex items-center group transition-all ${isCollapsed ? 'flex-col gap-3' : 'justify-between'}`}>
          {!isCollapsed && <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-400">Channels</h2>}
          
          <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col w-full' : ''}`}>
              <button 
                onClick={() => setIsJoinModalOpen(true)}
                className={`text-slate-500 hover:text-slate-300 transition-colors hover:bg-slate-800 rounded ${isCollapsed ? 'p-2 w-10 h-10 flex items-center justify-center' : 'p-1'}`} 
                title="Browse Channels"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className={`text-slate-500 hover:text-slate-300 transition-colors hover:bg-slate-800 rounded ${isCollapsed ? 'p-2 w-10 h-10 flex items-center justify-center' : 'p-1'}`} 
                title="Create Channel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
          </div>
        </div>
        
        <ul className={`space-y-0.5 ${isCollapsed ? 'px-2' : ''} mb-6`}>
          {filteredGroupChannels.length === 0 && searchQuery && !isCollapsed && (
             <li className="px-4 py-2 text-xs text-slate-600 italic">No channels match</li>
          )}
          {filteredGroupChannels.map((channel) => {
            const isActive = channel.channel_id === currentChannelId;
            return (
              <li key={channel.channel_id}>
                <button
                  onClick={() => onSelectChannel(channel.channel_id)}
                  title={isCollapsed ? channel.channel_name : undefined}
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
                  <span className={`text-lg leading-none ${isCollapsed ? 'opacity-100 text-xl' : 'text-opacity-70 mr-2 opacity-60'}`}>
                    {channel.is_private ? '🔒' : '#'}
                  </span>
                  
                  {!isCollapsed && (
                      <span className={`truncate ${isActive ? 'font-medium' : ''}`}>
                        {channel.channel_name}
                      </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Direct Messages Section - Extracted to component */}
        <DirectMessageList 
          channels={channels}
          users={users}
          currentUser={currentUser}
          currentChannelId={currentChannelId}
          onSelectChannel={onSelectChannel}
          isCollapsed={isCollapsed}
          searchQuery={searchQuery}
          onChannelCreated={onChannelCreated}
        />

      </div>

      {/* Footer / Settings */}
      <div className={`p-3 bg-slate-950 border-t border-slate-900 transition-all ${isCollapsed ? 'flex flex-col gap-3 items-center' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3 w-full' : 'justify-between'}`}>
           
           {/* Config Button */}
           <button 
             onClick={onOpenSettings}
             className={`text-slate-500 hover:text-slate-300 flex items-center gap-1 rounded hover:bg-slate-900 ${isCollapsed ? 'justify-center w-10 h-10' : 'text-xs'}`}
             title="Configuration"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className={`${isCollapsed ? 'h-5 w-5' : 'h-3 w-3'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
             {!isCollapsed && "Config"}
           </button>

            {/* Profile Button (Collapsed Only) */}
           {isCollapsed && (
             <button 
                onClick={() => onUserClick(currentUser)}
                className="text-slate-500 hover:text-slate-300 flex items-center justify-center w-10 h-10 rounded hover:bg-slate-900"
                title="Your Profile"
             >
                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold border border-slate-600">
                    {currentUser.display_name[0]}
                </div>
             </button>
           )}

           {/* Logout Button */}
           <button 
                onClick={onLogout} 
                className={`text-red-400 hover:text-red-300 flex items-center gap-1 rounded hover:bg-slate-900 ${isCollapsed ? 'justify-center w-10 h-10' : 'text-xs'}`}
                title="Sign Out"
            >
             {!isCollapsed && "Sign Out"}
             {isCollapsed && (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
             )}
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
            onJoined={(id) => onChannelCreated({ channel_id: id } as any)}
            currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default Sidebar;