import React from 'react';
import { Channel, User } from '../types';

interface SidebarProps {
  channels: Channel[];
  currentChannelId: string;
  onSelectChannel: (id: string) => void;
  currentUser: User;
  onOpenSettings: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  channels, 
  currentChannelId, 
  onSelectChannel, 
  currentUser,
  onOpenSettings,
  onLogout
}) => {
  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 flex-shrink-0">
      {/* Workspace Header */}
      <div className="p-4 border-b border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer group">
        <h1 className="text-white font-bold text-lg truncate">Lax HQ</h1>
        <div className="flex items-center text-xs mt-1">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
          <span className="group-hover:text-white transition-colors">{currentUser.display_name}</span>
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2 flex items-center justify-between group">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-400">Channels</h2>
          <button className="text-slate-500 hover:text-slate-300" title="Add Channel (Mock)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
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
                  <span className="text-opacity-70 mr-2 text-lg leading-none opacity-60">#</span>
                  <span className={`truncate ${isActive ? 'font-medium' : ''}`}>
                    {channel.channel_name}
                  </span>
                  {channel.is_private && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
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
    </div>
  );
};

export default Sidebar;