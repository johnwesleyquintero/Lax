import React, { useState, useRef, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  channelName: string;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, channelName, disabled }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

    // Insert formatting around selection or at cursor
    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    setText(newText);
    
    // Defer focus restoration to ensure React state update has processed
    setTimeout(() => {
        textarea.focus();
        // Move cursor inside the formatting if no text was selected
        if (start === end) {
            textarea.setSelectionRange(start + prefix.length, start + prefix.length);
        } else {
            // Select the text including markers (or just the text? standard is keeping selection)
            // Let's put cursor after the suffix for ease of typing
            textarea.setSelectionRange(end + prefix.length + suffix.length, end + prefix.length + suffix.length);
        }
    }, 0);
  };

  return (
    <div className="px-4 pb-4 pt-2 bg-white">
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
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={`Message #${channelName}`}
          className="w-full max-h-60 min-h-[80px] p-3 text-gray-900 placeholder-gray-400 focus:outline-none resize-none bg-transparent"
          rows={1}
          style={{ height: 'auto', minHeight: '44px' }}
        />
        <div className="flex justify-between items-center px-2 pb-2">
            <div className="text-xs text-gray-400">
                Supports Markdown: <strong>*bold*</strong>, <em>_italic_</em>, <del>~strike~</del>, <code>`code`</code>
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