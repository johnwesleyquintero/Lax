import React, { useState } from 'react';
import { api } from '../services/gas';
import { User, Channel } from '../types';
import { useToast } from '../contexts/ToastContext';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreated: (channel: Channel) => void;
  currentUser: User;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ onClose, onCreated, currentUser }) => {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const newChannel = await api.createChannel(name, isPrivate, currentUser.user_id);
      addToast(`Channel #${newChannel.channel_name} created.`, 'success');
      onCreated(newChannel);
      onClose();
    } catch (error) {
      console.error(error);
      addToast("Failed to create channel. Try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Create Channel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel Name
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">#</span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. operations"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-3 sm:text-sm border-gray-300 rounded-md border py-2"
                maxLength={25}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Names must be lowercase, without spaces or periods, and shorter than 25 characters.
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="private"
                  name="private"
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="private" className="font-medium text-gray-700">Make private</label>
                <p className="text-gray-500">
                  {isPrivate 
                    ? "Only invited members can view this channel." 
                    : "Anyone in your organization can find and join."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;