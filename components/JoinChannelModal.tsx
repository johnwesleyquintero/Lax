import React, { useState, useEffect } from 'react';
import { api } from '../services/gas';
import { User, Channel } from '../types';

interface JoinChannelModalProps {
  onClose: () => void;
  onJoined: (channelId: string) => void;
  currentUser: User;
}

const JoinChannelModal: React.FC<JoinChannelModalProps> = ({ onClose, onJoined, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [browsableChannels, setBrowsableChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Private Join State
  const [privateId, setPrivateId] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (activeTab === 'public') {
      loadPublicChannels();
    }
  }, [activeTab]);

  const loadPublicChannels = async () => {
    setLoading(true);
    try {
        const channels = await api.getBrowsableChannels(currentUser.user_id);
        setBrowsableChannels(channels);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleJoin = async (channelId: string) => {
    setLoading(true);
    setJoinError('');
    try {
        await api.joinChannel(channelId, currentUser.user_id);
        onJoined(channelId);
        onClose();
    } catch (e) {
        console.error(e);
        setJoinError('Failed to join. Invalid ID or system error.');
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Join Channel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
            <button 
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'public' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('public')}
            >
                Browse Public
            </button>
            <button 
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'private' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('private')}
            >
                Enter Code
            </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
            {activeTab === 'public' && (
                <div className="space-y-4">
                    {loading && <div className="text-center text-gray-400">Scanning frequency...</div>}
                    {!loading && browsableChannels.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                            No new public channels found.
                        </div>
                    )}
                    {browsableChannels.map(channel => (
                        <div key={channel.channel_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div>
                                <div className="font-bold text-gray-800"># {channel.channel_name}</div>
                                <div className="text-xs text-gray-500">Public Channel</div>
                            </div>
                            <button
                                onClick={() => handleJoin(channel.channel_id)}
                                className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                            >
                                Join
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'private' && (
                <div>
                    <p className="text-sm text-gray-600 mb-4">
                        Enter the secure Channel ID to join a private communication line.
                    </p>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Channel ID</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                            placeholder="c_ops_xyz_123"
                            value={privateId}
                            onChange={(e) => setPrivateId(e.target.value)}
                        />
                    </div>
                    {joinError && (
                        <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">
                            {joinError}
                        </div>
                    )}
                    <button 
                        onClick={() => handleJoin(privateId)}
                        disabled={!privateId || loading}
                        className="w-full py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Join Private Channel'}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default JoinChannelModal;