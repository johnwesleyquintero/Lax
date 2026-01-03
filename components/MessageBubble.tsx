import React, { useState } from 'react';
import { Message, User } from '../types';

interface MessageBubbleProps {
  message: Message;
  user?: User;
  isSequential: boolean;
  onUserClick: (user: User) => void;
  currentUser?: User;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
}

const isImageUrl = (url: string) => {
  return /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(url);
};

// --- Parsers ---

// 5. Italic & Strike
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

// 4. Bold
const parseBold = (text: string, keyPrefix: string) => {
    const boldParts = text.split(/(\*[^*]+\*)/g);
    return boldParts.map((bPart, bIndex) => {
        if (bPart.startsWith('*') && bPart.endsWith('*') && bPart.length > 1) {
            const content = bPart.slice(1, -1);
            return (
                <strong key={`${keyPrefix}-b-${bIndex}`} className="font-semibold text-gray-900">
                    {parseItalicAndStrike(content, `${keyPrefix}-b-${bIndex}`)}
                </strong>
            );
        }
        return parseItalicAndStrike(bPart, `${keyPrefix}-t-${bIndex}`);
    });
};

// 3. Mentions
const parseMentions = (text: string, keyPrefix: string) => {
    // Updated regex to include dots in username handles
    const mentionParts = text.split(/(@[a-zA-Z0-9_\-\.]+)/g);
    return (
        <span key={`${keyPrefix}-m-group`}>
            {mentionParts.map((mPart, mIndex) => {
                if (mPart.startsWith('@') && mPart.length > 1) {
                    return (
                        <span key={`${keyPrefix}-m-${mIndex}`} className="bg-blue-100 text-blue-800 rounded px-1 py-0.5 font-medium mx-0.5 cursor-pointer hover:bg-blue-200 transition-colors">
                            {mPart}
                        </span>
                    );
                }
                return parseBold(mPart, `${keyPrefix}-m-${mIndex}`);
            })}
        </span>
    );
};

// 2. URLs & Images
const parseUrlsAndImages = (text: string, keyPrefix: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlParts = text.split(urlRegex);

    return (
        <span key={`${keyPrefix}-u-group`}>
            {urlParts.map((uPart, uIndex) => {
                if (uPart.match(urlRegex)) {
                    if (isImageUrl(uPart)) {
                        return (
                             <div key={`${keyPrefix}-img-${uIndex}`} className="block my-2">
                                <img 
                                    src={uPart} 
                                    alt="attachment"
                                    className="max-w-full sm:max-w-sm max-h-80 object-contain rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-95 transition-opacity bg-gray-50"
                                    onClick={(e) => { e.stopPropagation(); window.open(uPart, '_blank'); }}
                                    loading="lazy"
                                />
                             </div>
                        );
                    }
                    return (
                        <a 
                            key={`${keyPrefix}-u-${uIndex}`} 
                            href={uPart} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline break-all"
                            onClick={(e) => e.stopPropagation()} 
                        >
                            {uPart}
                        </a>
                    );
                }
                return parseMentions(uPart, `${keyPrefix}-u-${uIndex}`);
            })}
        </span>
    );
};

// 1. Blockquotes
const parseBlockquotes = (text: string, keyPrefix: string) => {
    // Split by lines that start with '> '
    // We use a regex that captures the quote including the newline before it if exists
    const quoteParts = text.split(/((?:^|\n)>\s[^\n]+)/g);
    
    return quoteParts.map((part, index) => {
        const trimmed = part.trim();
        if (trimmed.startsWith('>')) {
            // Remove the '>' and optional space
            const content = trimmed.substring(1).trim();
            return (
                <div key={`${keyPrefix}-bq-${index}`} className="border-l-4 border-gray-300 pl-3 py-1 my-1 italic text-gray-600 bg-gray-50/50 rounded-r">
                    {parseUrlsAndImages(content, `${keyPrefix}-bq-${index}`)}
                </div>
            );
        }
        // Handle newlines explicitly if split consumed them? 
        // split regex includes newlines in the capture group if configured, 
        // but here 'part' might be just "\n" or text.
        // We pass strictly to next parser.
        return parseUrlsAndImages(part, `${keyPrefix}-bq-text-${index}`);
    });
};


// Root Parser: Code Blocks
const formatContent = (text: string) => {
  if (!text) return null;

  // Split by Code Blocks (`code`) - highest precedence
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, index) => {
    // If it's a code block
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code key={`c-${index}`} className="bg-slate-100 text-red-500 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200 align-middle">
          {part.slice(1, -1)}
        </code>
      );
    }
    
    // Parse everything else
    return parseBlockquotes(part, `root-${index}`);
  });
};


const MessageBubble: React.FC<MessageBubbleProps> = ({ 
    message, 
    user, 
    isSequential, 
    onUserClick, 
    currentUser, 
    onEdit, 
    onDelete 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);

  const date = new Date(message.created_at);
  const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  
  const isMine = currentUser && user && currentUser.user_id === user.user_id;

  const handleUserClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (user) onUserClick(user);
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() === message.content) {
        setIsEditing(false);
        return;
    }
    setIsSaving(true);
    await onEdit(message.message_id, editContent);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSaveEdit();
      }
      if (e.key === 'Escape') {
          setIsEditing(false);
          setEditContent(message.content);
      }
  };

  // Deterministic color
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

  // ACTIONS RENDERER
  const renderActions = () => {
    if (!isMine || isEditing) return null;
    return (
        <div className={`absolute top-[-12px] right-4 bg-white shadow-sm border border-gray-200 rounded-md flex items-center p-0.5 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'} z-10`}>
             <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" 
                title="Edit Message"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
             </button>
             <button 
                onClick={() => { if(window.confirm('Delete this message?')) onDelete(message.message_id); }}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" 
                title="Delete Message"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
             </button>
        </div>
    );
  };

  // EDIT MODE RENDERER
  if (isEditing) {
      return (
          <div className="px-4 py-2 bg-slate-50 border-l-4 border-slate-300 ml-4 rounded-r">
              <textarea 
                className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                  <button onClick={() => setIsEditing(false)} className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-white">Cancel</button>
                  <button 
                    onClick={handleSaveEdit} 
                    disabled={isSaving}
                    className="px-2 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
              </div>
          </div>
      )
  }

  // SEQUENTIAL RENDERER
  if (isSequential) {
    return (
      <div 
        className="group relative flex items-start px-4 py-0.5 hover:bg-gray-50 -ml-4 pl-4 border-l-4 border-transparent hover:border-gray-200"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="w-10 flex-shrink-0 text-[10px] text-gray-400 text-right pr-3 opacity-0 group-hover:opacity-100 select-none pt-1">
          {timeString}
        </div>
        <div className="flex-1 text-gray-800 break-words leading-relaxed max-w-full relative">
           {formatContent(message.content)}
           {renderActions()}
        </div>
      </div>
    );
  }

  // STANDARD RENDERER
  return (
    <div 
        className="group relative flex items-start px-4 py-2 mt-2 hover:bg-gray-50 -ml-4 pl-4 border-l-4 border-transparent hover:border-gray-200"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
      <button 
        onClick={handleUserClick}
        className={`w-9 h-9 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mr-3 transition-transform hover:scale-105 ${getColor(message.user_id)}`}
      >
        {initial}
      </button>
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-baseline mb-0.5">
          <button onClick={handleUserClick} className="font-bold text-gray-900 mr-2 hover:underline decoration-gray-400">
            {displayName}
          </button>
          <span className="text-xs text-gray-500">{timeString}</span>
        </div>
        <div className="text-gray-800 break-words leading-relaxed">
          {formatContent(message.content)}
        </div>
        {renderActions()}
      </div>
    </div>
  );
};

export default MessageBubble;