import React, { useState } from 'react';
import { api } from '../services/gas';
import { User, Channel } from '../types';

interface CreateDMModalProps {
  onClose: () => void;
  onCreated: (channel: Channel) => void;
  currentUser: User;
  users: User[];
}

const CreateDMModal: React.FC<CreateDMModalProps> = ({ onClose, onCreated, currentUser, users }) => {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Filter out self and search
  const filteredUsers = users.filter(u => 
      u.user_id !== currentUser.user_id &&
      (u.display_name.toLowerCase().includes(search.toLowerCase()) || 
       u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleStartDM = async (targetUser: User) => {
    setLoading(true);
    try {
      const dmChannel = await api.createDM(targetUser.user_id, currentUser.user_id);
      onCreated(dmChannel);
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to open secure line");
    } finally {
      setLoading(false);
    }
  };

  const getColor = (str: string) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Direct Messages</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find an operator..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
            />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
            {filteredUsers.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                    No operators found.
                </div>
            )}
            
            <ul className="space-y-1">
                {filteredUsers.map(user => (
                    <li key={user.user_id}>
                        <button 
                            onClick={() => handleStartDM(user)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                            disabled={loading}
                        >
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getColor(user.user_id)}`}>
                                {user.display_name[0]}
                            </div>
                            <div>
                                <div className="font-bold text-gray-800">{user.display_name}</div>
                                <div className="text-xs text-gray-500">{user.job_title || 'Operator'}</div>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateDMModal;