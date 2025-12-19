import React from 'react';
import { User } from '../types';

interface UserProfileModalProps {
  user: User;
  currentUser: User;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, currentUser, onClose }) => {
  const isMe = user.user_id === currentUser.user_id;

  // Deterministic color (duplicated logic from MessageBubble to keep independent)
  const getColor = (str: string) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const initial = user.display_name.charAt(0).toUpperCase();
  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const lastActive = new Date(user.last_active).toLocaleString();

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
       {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm relative overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Banner / Header */}
        <div className="h-24 bg-slate-900 w-full relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        {/* Profile Content */}
        <div className="px-6 pb-6 -mt-12 flex flex-col items-center">
            {/* Avatar */}
            <div className={`h-24 w-24 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white text-4xl font-bold ${getColor(user.user_id)}`}>
                {initial}
            </div>

            <div className="text-center mt-3">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 justify-center">
                    {user.display_name}
                    {user.role === 'admin' && (
                        <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-red-200">
                            Admin
                        </span>
                    )}
                </h2>
                {user.job_title && (
                    <p className="text-sm text-gray-500 font-medium">{user.job_title}</p>
                )}
            </div>

            {/* Status */}
            <div className="mt-4 w-full bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                <p className="text-sm text-gray-700 italic">
                    "{user.status || "Standing by."}"
                </p>
            </div>

            {/* Details Grid */}
            <div className="w-full mt-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Email</span>
                    <span className="text-sm text-gray-700">{user.email}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Local Time</span>
                    <span className="text-sm text-gray-700">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Joined</span>
                    <span className="text-sm text-gray-700">{joinDate}</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase">User ID</span>
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{user.user_id.slice(0, 8)}...</code>
                </div>
            </div>

            {/* Actions */}
            {isMe && (
                <div className="mt-6 w-full">
                    <button className="w-full py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        Edit Profile
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;