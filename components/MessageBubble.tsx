import React from 'react';
import { Message, User } from '../types';

interface MessageBubbleProps {
  message: Message;
  user?: User;
  isSequential: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, user, isSequential }) => {
  const date = new Date(message.created_at);
  
  // Format time: "10:45 AM"
  const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  
  // Deterministic color for avatar background based on user ID
  const getColor = (str: string) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const displayName = user ? user.display_name : 'Unknown Operator';
  const initial = displayName.charAt(0).toUpperCase();

  if (isSequential) {
    return (
      <div className="group flex items-start px-4 py-0.5 hover:bg-gray-50 -ml-4 pl-4 border-l-4 border-transparent hover:border-gray-200">
        <div className="w-10 flex-shrink-0 text-[10px] text-gray-400 text-right pr-3 opacity-0 group-hover:opacity-100 select-none pt-1">
          {timeString}
        </div>
        <div className="flex-1 text-gray-800 break-words leading-relaxed max-w-full">
           {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start px-4 py-2 mt-2 hover:bg-gray-50 -ml-4 pl-4 border-l-4 border-transparent hover:border-gray-200">
      <div className={`w-9 h-9 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mr-3 ${getColor(message.user_id)}`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline mb-0.5">
          <span className="font-bold text-gray-900 mr-2">{displayName}</span>
          <span className="text-xs text-gray-500">{timeString}</span>
        </div>
        <div className="text-gray-800 break-words leading-relaxed">
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;