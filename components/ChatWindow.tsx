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
}

const ChatWindow: React.FC<ChatWindowProps> = ({ channel, currentUser, users }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
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
        // Optimization: In a real app, we would pass the last timestamp we have
        // const lastTs = messages.length > 0 ? messages[messages.length - 1].created_at : undefined;
        // For simplicity in this demo, we fetch all for the channel to handle "edits" (if we supported them) or deletions implicitly by full replace
        // But for true Append-Only as requested, we should merge.
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
        
        // The poll will pick up the real message eventually and replace the temp one
        // In a more complex app we'd handle the ID swap. 
        // For now, the optimistic push makes it feel instant.
    } catch (error) {
        console.error("Failed to send", error);
        alert("Failed to send message. Check console.");
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-center sm:justify-between px-4 bg-white flex-shrink-0">
        <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-1 font-bold text-gray-800">
                <span className="text-gray-400">#</span>
                {channel.channel_name}
            </div>
            <span className="text-xs text-gray-500">
                {channel.is_private ? 'Private Group' : 'Public Channel'}
            </span>
        </div>
        <div className="hidden sm:flex items-center -space-x-2 overflow-hidden">
             {/* Mock avatars of channel members */}
             <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-300" />
             <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-400" />
             <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-500" />
             <span className="ml-4 text-xs text-gray-400 pl-2">3 Members</span>
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
                    <span className="text-xl text-gray-400 font-bold">#</span>
                </div>
                <h1 className="font-bold text-2xl text-gray-900">Welcome to #{channel.channel_name}!</h1>
                <p className="text-gray-600 mt-1">
                    This is the start of the <span className="font-bold">#{channel.channel_name}</span> channel.
                    {channel.is_private ? ' This is a private space.' : ' This channel is open to the team.'}
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
            channelName={channel.channel_name}
            disabled={isSending}
            users={users}
        />
      </div>
    </div>
  );
};

export default ChatWindow;