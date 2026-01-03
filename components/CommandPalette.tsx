import React, { useState, useEffect, useRef } from 'react';
import { Channel, User } from '../types';
import { api } from '../services/gas';
import { useToast } from '../contexts/ToastContext';

interface CommandPaletteProps {
  channels: Channel[];
  users: User[];
  currentUser: User;
  onSelectChannel: (channelId: string) => void;
  onChannelCreated: (channel: Channel) => void;
}

type SearchResult = 
  | { type: 'channel'; data: Channel; key: string }
  | { type: 'user'; data: User; key: string };

const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  channels, 
  users, 
  currentUser, 
  onSelectChannel,
  onChannelCreated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { addToast } = useToast();

  // Toggle Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filtering Logic
  useEffect(() => {
    if (!isOpen) return;

    const q = query.toLowerCase();
    
    // 1. Channels (Exclude DMs from direct channel search usually, unless we want to find them by raw name)
    // Actually, let's show standard channels here.
    const matchedChannels = channels
      .filter(c => 
        (c.type === 'channel' || !c.type) && // Backwards compat for undefined type
        c.channel_name.toLowerCase().includes(q)
      )
      .map(c => ({ type: 'channel' as const, data: c, key: c.channel_id }));

    // 2. Users (For DMs)
    const matchedUsers = users
      .filter(u => 
        u.user_id !== currentUser.user_id && 
        (u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      )
      .map(u => ({ type: 'user' as const, data: u, key: u.user_id }));

    setResults([...matchedChannels, ...matchedUsers]);
    setSelectedIndex(0);
  }, [query, isOpen, channels, users, currentUser.user_id]);

  // Scroll into view logic
  useEffect(() => {
    if (listRef.current) {
        const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [selectedIndex]);

  const handleSelect = async (result: SearchResult) => {
    setIsOpen(false);
    
    if (result.type === 'channel') {
      onSelectChannel(result.data.channel_id);
    } else {
      // User selected -> Find existing DM or create new
      const targetUser = result.data;
      
      // Look for existing DM in local channels list
      // A DM channel name usually contains both user IDs or we check membership if we had it.
      // Since we don't have full membership list here easily, we rely on our naming convention or existing list.
      // We filtered 'channels' prop earlier for 'channel' type, but let's look at ALL channels passed in prop
      
      // Robust check: Look for a channel of type 'dm' that 'includes' the user ID in name (hacky but works with our mock)
      // OR better: Ask backend/service to find-or-create.
      
      // Client-side attempt first:
      const existingDM = channels.find(c => 
         c.type === 'dm' && c.channel_name.includes(targetUser.user_id) && c.channel_name.includes(currentUser.user_id)
      );

      if (existingDM) {
        onSelectChannel(existingDM.channel_id);
      } else {
        // Create new
        try {
          addToast(`Opening secure line with ${targetUser.display_name}...`, 'info', 2000);
          const newDM = await api.createDM(targetUser.user_id, currentUser.user_id);
          onChannelCreated(newDM); // Update App state
          onSelectChannel(newDM.channel_id); // Switch
        } catch (e) {
          console.error(e);
          addToast("Failed to connect.", 'error');
        }
      }
    }
  };

  const handleNavigation = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-[15vh] backdrop-blur-sm animate-in fade-in duration-100">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>

      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden relative flex flex-col max-h-[60vh] animate-in zoom-in-95 duration-100">
        
        {/* Input */}
        <div className="border-b border-gray-200 p-4 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-lg outline-none text-gray-900 placeholder-gray-400"
            placeholder="Jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleNavigation}
          />
          <div className="text-xs font-mono text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">ESC</div>
        </div>

        {/* Results */}
        <ul ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-1 scroll-py-2">
          {results.length === 0 && (
            <li className="p-4 text-center text-gray-400 text-sm">
              No matching channels or operators.
            </li>
          )}

          {results.map((result, index) => {
            const isSelected = index === selectedIndex;
            return (
              <li key={result.key}>
                <button
                  onClick={() => handleSelect(result)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isSelected ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                     isSelected ? 'bg-white/20 text-white' : (result.type === 'channel' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600')
                  }`}>
                    {result.type === 'channel' 
                        ? (result.data.is_private ? '🔒' : '#') 
                        : result.data.display_name.charAt(0).toUpperCase()
                    }
                  </div>
                  
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {result.type === 'channel' ? result.data.channel_name : result.data.display_name}
                    </div>
                    {result.type === 'user' && (
                        <div className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                            {result.data.job_title || 'Operator'}
                        </div>
                    )}
                  </div>

                  {/* Enter Hint */}
                  {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        
        {/* Footer */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
            <span>
                <strong className="font-medium text-gray-700">Tab</strong> to cycle
            </span>
            <span>
                <strong className="font-medium text-gray-700">↑↓</strong> to navigate
            </span>
             <span>
                <strong className="font-medium text-gray-700">↵</strong> to select
            </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;