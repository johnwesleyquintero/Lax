import React, { useState } from 'react';
import { api } from '../services/gas';
import { Channel } from '../types';
import { useToast } from '../contexts/ToastContext';

interface EditChannelModalProps {
  channel: Channel;
  onClose: () => void;
  onUpdated: (channel: Channel) => void;
}

const EditChannelModal: React.FC<EditChannelModalProps> = ({ channel, onClose, onUpdated }) => {
  const [name, setName] = useState(channel.channel_name);
  const [isPrivate, setIsPrivate] = useState(channel.is_private);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const updatedChannel = await api.updateChannel(channel.channel_id, name, isPrivate);
      addToast(`Channel #${updatedChannel.channel_name} updated.`, 'success');
      onUpdated(updatedChannel);
      onClose();
    } catch (error) {
      console.error(error);
      addToast("Failed to update channel.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Channel</h2>
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
                    ? "Only members can view this channel." 
                    : "Anyone in your organization can join."}
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditChannelModal;