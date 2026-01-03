import React, { useEffect, useRef, useState } from 'react';
import { Channel, Message, User } from '../types';
import { APP_CONFIG } from '../constants';
import { api } from '../services/gas';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import EditChannelModal from './EditChannelModal';
import { useToast } from '../contexts/ToastContext';

interface ChatWindowProps {
  channel: Channel;
  currentUser: User;
  users: User[];
  onUserClick: (user: User) => void;
  onChannelDeleted: () => void;
  onChannelUpdated: (channel: Channel) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ channel, currentUser, users, onUserClick, onChannelDeleted, onChannelUpdated }) => {
  const [messages, setMessages] = useState<Message[]>([]); // Confirmed messages from server
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]); // Optimistic local messages
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const { addToast } = useToast();
  
  // Create a map for fast user lookups
  const userMap = useRef<Record<string, User>>({});
  
  // Update user map when users change
  useEffect(() => {
    userMap.current = users.reduce((acc, user) => {
      acc[user.user_id] = user;
      return acc;
    }, {} as Record<string, User>);
  }, [users]);

  // Handle Scroll Logic to prevent jumping
  const handleScroll = () => {
    if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Consider "at bottom" if within 100px
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAtBottom(atBottom);
    }
  };

  // Reset state when channel changes
  useEffect(() => {
    setIsAtBottom(true);
    setMessages([]);
    setPendingMessages([]); // Clear pending messages for previous channel
    setIsLoading(true);
  }, [channel.channel_id]);

  // Polling logic
  useEffect(() => {
    let isMounted = true;
    let pollInterval: any;

    const fetchMessages = async () => {
      try {
        const msgs = await api.getMessages(channel.channel_id);
        
        if (isMounted) {
          // Optimization: deep compare to prevent unnecessary re-renders
          setMessages(prev => {
             // Simple JSON stringify is efficient enough for typical chat batch sizes
             if (JSON.stringify(prev) === JSON.stringify(msgs)) return prev;
             return msgs;
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    };

    // Initial fetch
    fetchMessages();

    // Start Polling
    pollInterval = setInterval(fetchMessages, APP_CONFIG.POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [channel.channel_id]);

  // Combined messages for display (Confirmed + Pending)
  // We filter out any pending messages that might have been confirmed by the server (ID collision check, though IDs usually differ)
  const displayMessages = [...messages, ...pendingMessages];

  // Auto-scroll effect
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages.length, isAtBottom]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    setIsSending(true);
    setIsAtBottom(true); // Force scroll to bottom on send
    
    // Optimistic UI update
    const tempId = 'temp-' + Date.now();
    const tempMsg: Message = {
        message_id: tempId,
        channel_id: channel.channel_id,
        user_id: currentUser.user_id,
        content: content,
        created_at: new Date().toISOString()
    };
    
    setPendingMessages(prev => [...prev, tempMsg]);

    try {
        const realMsg = await api.sendMessage(channel.channel_id, currentUser.user_id, content);
        
        // On success, remove from pending and add to confirmed
        setPendingMessages(prev => prev.filter(m => m.message_id !== tempId));
        setMessages(prev => {
            // Check if it already exists (from a quick poll) to avoid dupe
            if (prev.some(m => m.message_id === realMsg.message_id)) return prev;
            return [...prev, realMsg];
        });
    } catch (error) {
        console.error("Failed to send", error);
        addToast("Failed to send message. Connection failed.", 'error');
        // Keep in pending but maybe mark as error? For now, we leave it or user can retry.
        // To be safe, let's remove it so it doesn't look like it sent.
        setPendingMessages(prev => prev.filter(m => m.message_id !== tempId));
    } finally {
        setIsSending(false);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
      // Optimistic
      setMessages(prev => prev.map(m => m.message_id === messageId ? { ...m, content: newContent } : m));
      try {
          await api.editMessage(messageId, newContent);
      } catch (e) {
          console.error("Failed to edit", e);
          addToast("Failed to edit message.", 'error');
      }
  };

  const handleDeleteMessage = async (messageId: string) => {
      // Optimistic
      setMessages(prev => prev.filter(m => m.message_id !== messageId));
      try {
          await api.deleteMessage(messageId);
      } catch (e) {
          console.error("Failed to delete", e);
          addToast("Failed to delete message.", 'error');
      }
  };

  const handleDeleteChannel = async () => {
      if (confirm(`Are you sure you want to delete #${channel.channel_name}? This cannot be undone.`)) {
          try {
              await api.deleteChannel(channel.channel_id);
              addToast(`Channel #${channel.channel_name} deleted.`, 'success');
              onChannelDeleted();
          } catch (e) {
              console.error(e);
              addToast("Failed to delete channel.", 'error');
          }
      }
  };

  // --- Display Name Logic ---
  const getChannelDisplayInfo = () => {
      // Force DM detection if name starts with dm_ (Legacy Support)
      const isDM = channel.type === 'dm' || channel.channel_name.startsWith('dm_');

      if (isDM) {
          // Robust lookup: Find user inside the string
          const otherUser = users.find(u => 
              channel.channel_name.includes(u.user_id) && 
              u.user_id !== currentUser.user_id
          );
          
          if (otherUser) {
              return { 
                  displayName: otherUser.display_name, 
                  isDM: true,
                  icon: (
                    <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold mr-1">
                        {otherUser.display_name[0].toUpperCase()}
                    </div>
                  )
              };
          }
          return { displayName: 'Unknown Operator', isDM: true, icon: <span className="mr-1">@</span> };
      }
      
      // Regular Channel
      return { 
          displayName: channel.channel_name, 
          isDM: false, 
          icon: <span className="text-gray-400 mr-1 text-lg">#</span>
      };
  };

  const { displayName, isDM, icon } = getChannelDisplayInfo();
  const isCreator = !isDM && (currentUser.user_id === channel.created_by || currentUser.role === 'admin');

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white flex-shrink-0 relative z-20 shadow-sm">
        <div className="flex flex-col">
            <div className="flex items-center gap-1 font-bold text-gray-800 cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1 transition-colors" onClick={() => isCreator && setShowChannelSettings(!showChannelSettings)}>
                {icon}
                {displayName}
                {isCreator && (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                     </svg>
                )}
            </div>
            <span className="text-xs text-gray-500">
                {isDM ? 'Direct Message' : (channel.is_private ? 'Private Group' : 'Public Channel')}
            </span>
        </div>

        {/* Channel Settings Dropdown */}
        {showChannelSettings && isCreator && (
            <div className="absolute top-12 left-4 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                    Channel Settings
                </div>
                <button 
                    onClick={() => { setShowChannelSettings(false); setIsEditModalOpen(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit Channel
                </button>
                <button 
                    onClick={handleDeleteChannel}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Channel
                </button>
            </div>
        )}

        {/* Click outside listener for dropdown */}
        {showChannelSettings && <div className="fixed inset-0 z-[-1]" onClick={() => setShowChannelSettings(false)}></div>}


        <div className="hidden sm:flex items-center -space-x-2 overflow-hidden">
             {/* Mock avatars of channel members - Random subset for visual flair */}
             {users.slice(0,3).map((u, i) => (
                 <div key={u.user_id} className={`inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-300 flex items-center justify-center text-[8px] text-white font-bold bg-slate-400`}>
                     {u.display_name[0]}
                 </div>
             ))}
             <span className="ml-4 text-xs text-gray-400 pl-2">{users.length} Operators</span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar flex flex-col bg-white"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
             <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
             <p className="text-xs text-gray-400 uppercase tracking-widest">Acquiring Signal...</p>
          </div>
        ) : (
          <>
            <div className="mt-auto"></div> {/* Push messages to bottom if few */}
            
            {/* Intro to Channel */}
            <div className="mb-8 mt-4 px-4 pb-8 border-b border-gray-100">
                <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    {isDM ? (
                        <span className="text-3xl text-slate-400 font-bold">@</span>
                    ) : (
                        <span className="text-3xl text-slate-400 font-bold">#</span>
                    )}
                </div>
                <h1 className="font-bold text-2xl text-slate-900">
                    {isDM ? displayName : `Welcome to #${displayName}!`}
                </h1>
                <p className="text-slate-500 mt-2 max-w-lg leading-relaxed">
                    {isDM 
                        ? `This is the start of your private encrypted line with ${displayName}. Operations conducted here are strictly confidential.`
                        : `This is the start of the #${displayName} channel.`
                    }
                    {!isDM && (channel.is_private ? ' This is a private space for authorized personnel only.' : ' This frequency is open to the entire organization.')}
                </p>
            </div>
            
            {displayMessages.length === 0 && !isLoading && (
                 <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm font-medium">No transmissions yet.</span>
                 </div>
            )}

            {displayMessages.map((msg, index) => {
              const prevMsg = displayMessages[index - 1];
              // Check if sequential: same user and less than 5 mins apart
              const isSequential = prevMsg 
                && prevMsg.user_id === msg.user_id
                && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000);
              
              const user = userMap.current[msg.user_id];
              const isPending = pendingMessages.some(pm => pm.message_id === msg.message_id);

              return (
                <div key={msg.message_id} className={isPending ? "opacity-70 transition-opacity" : ""}>
                    <MessageBubble 
                      message={msg} 
                      user={user} 
                      isSequential={isSequential}
                      onUserClick={onUserClick}
                      currentUser={currentUser}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                    />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 z-10 bg-white">
        <MessageInput 
            key={channel.channel_id}
            onSendMessage={handleSendMessage} 
            channelName={isDM ? displayName : channel.channel_name}
            disabled={isSending}
            users={users}
        />
      </div>

      {isEditModalOpen && (
        <EditChannelModal 
          channel={channel}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onChannelUpdated}
        />
      )}
    </div>
  );
};

export default ChatWindow;