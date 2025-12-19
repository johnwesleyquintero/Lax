import React, { useEffect, useRef, useState } from 'react';
import { Channel, Message, User } from '../types';
import { APP_CONFIG } from '../constants';
import { api } from '../services/gas';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

interface ChatWindowProps {
  channel: Channel;
  currentUser: User;
  users: User[];
  onUserClick: (user: User) => void;
  onChannelDeleted: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ channel, currentUser, users, onUserClick, onChannelDeleted }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Create a map for fast user lookups
  const userMap = useRef<Record<string, User>>({});
  
  // Update user map when users change
  useEffect(() => {
    userMap.current = users.reduce((acc, user) => {
      acc[user.user_id] = user;
      return acc;
    }, {} as Record<string, User>);
  }, [users]);

  // Polling logic
  useEffect(() => {
    let isMounted = true;
    let pollInterval: any;

    const fetchMessages = async () => {
      try {
        const msgs = await api.getMessages(channel.channel_id);
        
        if (isMounted) {
          setMessages(msgs);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    };

    // Initial fetch
    setMessages([]);
    setIsLoading(true);
    fetchMessages();

    // Start Polling
    pollInterval = setInterval(fetchMessages, APP_CONFIG.POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [channel.channel_id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, channel.channel_id]);

  const handleSendMessage = async (content: string) => {
    setIsSending(true);
    try {
        // Optimistic UI update
        const tempMsg: Message = {
            message_id: 'temp-' + Date.now(),
            channel_id: channel.channel_id,
            user_id: currentUser.user_id,
            content: content,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);

        await api.sendMessage(channel.channel_id, currentUser.user_id, content);
    } catch (error) {
        console.error("Failed to send", error);
        alert("Failed to send message. Check console.");
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
      }
  };

  const handleDeleteMessage = async (messageId: string) => {
      // Optimistic
      setMessages(prev => prev.filter(m => m.message_id !== messageId));
      try {
          await api.deleteMessage(messageId);
      } catch (e) {
          console.error("Failed to delete", e);
      }
  };

  const handleDeleteChannel = async () => {
      if (confirm(`Are you sure you want to delete #${channel.channel_name}? This cannot be undone.`)) {
          try {
              await api.deleteChannel(channel.channel_id);
              onChannelDeleted();
          } catch (e) {
              alert("Failed to delete channel");
              console.error(e);
          }
      }
  };

  // --- Display Name Logic ---
  const getChannelDisplayInfo = () => {
      if (channel.type === 'dm') {
          // Parse dm_userA_userB
          const parts = channel.channel_name.split('_');
          // Find the ID that isn't mine
          const otherId = parts.filter(p => p !== 'dm' && p !== currentUser.user_id)[0];
          const otherUser = users.find(u => u.user_id === otherId);
          
          if (otherUser) {
              return { 
                  displayName: otherUser.display_name, 
                  isDM: true,
                  icon: (
                    <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold mr-1">
                        {otherUser.display_name[0]}
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
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white flex-shrink-0 relative z-20">
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
      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar flex flex-col">
        {isLoading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
             Loading frequency...
          </div>
        ) : (
          <>
            <div className="mt-auto"></div> {/* Push messages to bottom if few */}
            
            {/* Intro to Channel */}
            <div className="mb-8 mt-4 px-4">
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                    {isDM ? (
                        <span className="text-xl text-gray-400 font-bold">@</span>
                    ) : (
                        <span className="text-xl text-gray-400 font-bold">#</span>
                    )}
                </div>
                <h1 className="font-bold text-2xl text-gray-900">
                    {isDM ? displayName : `Welcome to #${displayName}!`}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isDM 
                        ? `This is the start of your private conversation with ${displayName}.`
                        : `This is the start of the #${displayName} channel.`
                    }
                    {!isDM && (channel.is_private ? ' This is a private space.' : ' This channel is open to the team.')}
                </p>
            </div>

            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              // Check if sequential: same user and less than 5 mins apart
              const isSequential = prevMsg 
                && prevMsg.user_id === msg.user_id
                && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000);
              
              const user = userMap.current[msg.user_id];

              return (
                <MessageBubble 
                  key={msg.message_id} 
                  message={msg} 
                  user={user} 
                  isSequential={isSequential}
                  onUserClick={onUserClick}
                  currentUser={currentUser}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 z-10">
        <MessageInput 
            onSendMessage={handleSendMessage} 
            channelName={isDM ? displayName : channel.channel_name}
            disabled={isSending}
            users={users}
        />
      </div>
    </div>
  );
};

export default ChatWindow;