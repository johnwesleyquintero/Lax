import React from 'react';
import { Message, User } from '../types';

interface MessageBubbleProps {
  message: Message;
  user?: User;
  isSequential: boolean;
}

// Simple Markdown Parser for React
const formatContent = (text: string) => {
  if (!text) return null;

  // 1. Split by Code Blocks (`code`) - highest precedence, no nested formatting inside
  // Regex captures the delimiter and content: (`...`)
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, index) => {
    // If it's a code block
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code key={`c-${index}`} className="bg-slate-100 text-red-500 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200">
          {part.slice(1, -1)}
        </code>
      );
    }

    // 2. Parse Bold (*text*)
    const boldParts = part.split(/(\*[^*]+\*)/g);
    return (
      <span key={`p-${index}`}>
        {boldParts.map((bPart, bIndex) => {
          if (bPart.startsWith('*') && bPart.endsWith('*') && bPart.length > 1) {
            // Content inside bold
            const content = bPart.slice(1, -1);
            // 3. Parse Italic inside Bold (_text_)
            return (
               <strong key={`b-${index}-${bIndex}`} className="font-semibold text-gray-900">
                  {parseItalicAndStrike(content, `b-${index}-${bIndex}`)}
               </strong>
            );
          }
          // Not bold, parse Italic/Strike directly
          return parseItalicAndStrike(bPart, `t-${index}-${bIndex}`);
        })}
      </span>
    );
  });
};

// Helper for Italic and Strike recursion
const parseItalicAndStrike = (text: string, keyPrefix: string) => {
   const iParts = text.split(/(_[^_]+_)/g);
   return iParts.map((iPart, iIndex) => {
      if (iPart.startsWith('_') && iPart.endsWith('_') && iPart.length > 1) {
         const content = iPart.slice(1, -1);
         return (
            <em key={`${keyPrefix}-i-${iIndex}`} className="italic">
               {parseStrike(content, `${keyPrefix}-i-${iIndex}`)}
            </em>
         );
      }
      return parseStrike(iPart, `${keyPrefix}-i-${iIndex}`);
   });
};

const parseStrike = (text: string, keyPrefix: string) => {
    const sParts = text.split(/(~[^~]+~)/g);
    return sParts.map((sPart, sIndex) => {
        if (sPart.startsWith('~') && sPart.endsWith('~') && sPart.length > 1) {
            return (
                <del key={`${keyPrefix}-s-${sIndex}`} className="line-through text-gray-400">
                    {sPart.slice(1, -1)}
                </del>
            );
        }
        return <span key={`${keyPrefix}-tx-${sIndex}`}>{sPart}</span>;
    });
};

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
           {formatContent(message.content)}
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
          {formatContent(message.content)}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;