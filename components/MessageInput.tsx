import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { User } from '../types';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  channelName: string;
  disabled?: boolean;
  users?: User[];
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, channelName, disabled, users = [] }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mention State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (showMentions) {
      const filtered = users.filter(u => 
        u.display_name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5); // Limit to 5 suggestions
      setFilteredUsers(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredUsers([]);
    }
  }, [mentionQuery, showMentions, users]);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
    }
  };

  const handleSend = () => {
    if (!text.trim() || disabled) return;

    let finalMessage = text;

    // Slash Commands Processing
    if (text.startsWith('/')) {
        const cmd = text.trim().toLowerCase();
        if (cmd === '/shrug') {
            finalMessage = '¯\\_(ツ)_/¯';
        } else if (cmd === '/tableflip' || cmd === '/flip') {
            finalMessage = '(╯°□°)╯︵ ┻━┻';
        } else if (cmd === '/unflip') {
            finalMessage = '┬─┬ノ( º _ ºノ)';
        } else if (cmd === '/lenny') {
            finalMessage = '( ͡° ͜ʖ ͡°)';
        }
        // If it was a known command, finalMessage changed. If unknown, we send literally.
    }

    onSendMessage(finalMessage);
    setText('');
    setShowMentions(false);
    
    // Reset height
    if(textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        // Force reset to min height
        textareaRef.current.style.height = '44px'; 
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Mention Navigation
    if (showMentions && filteredUsers.length > 0) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredUsers.length - 1));
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < filteredUsers.length - 1 ? prev + 1 : 0));
            return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            selectUser(filteredUsers[selectedIndex]);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowMentions(false);
            return;
        }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      setText(newVal);
      adjustHeight();

      // Check for mention trigger
      const cursor = e.target.selectionStart;
      const textBeforeCursor = newVal.slice(0, cursor);
      
      // Look for the last word being typed
      const lastWordMatch = textBeforeCursor.match(/\S+$/);
      
      if (lastWordMatch && lastWordMatch[0].startsWith('@')) {
          const query = lastWordMatch[0].slice(1);
          // Only show if query doesn't contain invalid chars for a potential name yet
          // Updated regex to include dots
          if (/^[a-zA-Z0-9_\-\.]*$/.test(query)) {
              setMentionQuery(query);
              setShowMentions(true);
              return;
          }
      }
      
      setShowMentions(false);
  };

  const selectUser = (user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const textBeforeCursor = text.slice(0, cursor);
    const textAfterCursor = text.slice(cursor);

    // Find start of the mention
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    // Create a safe "Token" from the user name (remove spaces)
    const token = user.display_name.replace(/\s+/g, '');
    
    const newText = text.slice(0, lastAtIndex) + '@' + token + ' ' + textAfterCursor;
    
    setText(newText);
    setShowMentions(false);
    
    // Restore focus and move cursor
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = lastAtIndex + token.length + 2; // +2 for @ and space
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        adjustHeight();
    }, 0);
  };

  const applyFormat = (format: 'bold' | 'italic' | 'strike' | 'code') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);

    let prefix = '';
    let suffix = '';

    switch (format) {
      case 'bold': prefix = '*'; suffix = '*'; break;
      case 'italic': prefix = '_'; suffix = '_'; break;
      case 'strike': prefix = '~'; suffix = '~'; break;
      case 'code': prefix = '`'; suffix = '`'; break;
    }

    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    setText(newText);
    
    setTimeout(() => {
        textarea.focus();
        if (start === end) {
            textarea.setSelectionRange(start + prefix.length, start + prefix.length);
        } else {
            textarea.setSelectionRange(end + prefix.length + suffix.length, end + prefix.length + suffix.length);
        }
        adjustHeight();
    }, 0);
  };

  return (
    <div className="px-4 pb-4 pt-2 bg-white relative">
      
      {/* Mention Dropdown */}
      {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Operators
              </div>
              <ul>
                  {filteredUsers.map((user, index) => (
                      <li key={user.user_id}>
                          <button
                              onClick={() => selectUser(user)}
                              className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm ${
                                  index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                              <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
                                  {user.display_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium truncate">{user.display_name}</span>
                              <span className="text-gray-400 text-xs ml-auto">@{user.display_name.replace(/\s+/g, '')}</span>
                          </button>
                      </li>
                  ))}
              </ul>
          </div>
      )}

      <div className="border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white transition-all">
        <div className="bg-gray-50 border-b border-gray-200 px-2 py-1 flex items-center gap-2 rounded-t-lg">
           {/* Formatting toolbar */}
           <button 
             onClick={() => applyFormat('bold')}
             className="p-1 text-gray-500 hover:bg-gray-200 rounded transition-colors group" 
             title="Bold (Cmd+B)"
           >
             <span className="font-bold text-xs serif group-hover:text-gray-900">B</span>
           </button>
           <button 
             onClick={() => applyFormat('italic')}
             className="p-1 text-gray-500 hover:bg-gray-200 rounded transition-colors group" 
             title="Italic (Cmd+I)"
           >
             <span className="italic text-xs serif group-hover:text-gray-900">I</span>
           </button>
           <button 
             onClick={() => applyFormat('strike')}
             className="p-1 text-gray-500 hover:bg-gray-200 rounded transition-colors group" 
             title="Strike"
           >
             <span className="line-through text-xs serif group-hover:text-gray-900">S</span>
           </button>
           <div className="h-4 w-px bg-gray-300 mx-1"></div>
           <button 
             onClick={() => applyFormat('code')}
             className="p-1 text-gray-500 hover:bg-gray-200 rounded transition-colors group" 
             title="Code"
           >
             <span className="text-xs font-mono group-hover:text-gray-900">{'<>'}</span>
           </button>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={`Message #${channelName}`}
          className="w-full max-h-60 min-h-[44px] p-3 text-gray-900 placeholder-gray-400 focus:outline-none resize-none bg-transparent overflow-hidden"
          rows={1}
          style={{ height: 'auto', minHeight: '44px' }}
        />
        <div className="flex justify-between items-center px-2 pb-2">
            <div className="text-xs text-gray-400">
                Type <strong>@</strong> to mention, <strong>/shrug</strong> for fun
            </div>
            <button
                onClick={handleSend}
                disabled={!text.trim() || disabled}
                className={`p-2 rounded transition-colors ${
                    text.trim() 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
            </button>
        </div>
      </div>
      <div className="text-[10px] text-gray-400 mt-1 text-center">
        <strong>Return</strong> to send &nbsp; <strong>Shift + Return</strong> to add a new line
      </div>
    </div>
  );
};

export default MessageInput;