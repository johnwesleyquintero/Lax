import React, { useState, useEffect } from 'react';
import { api } from '../services/gas';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [useMock, setUseMock] = useState(true);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    const config = api.getConfig();
    setUseMock(config.useMock);
    setApiUrl(config.apiUrl);
  }, []);

  const handleSave = () => {
    api.setConfig(useMock, apiUrl);
    onClose();
    window.location.reload(); // Reload to refresh services
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">System Configuration</h2>
        
        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useMock} 
              onChange={(e) => setUseMock(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
            />
            <span className="text-gray-700 font-medium">Use Demo Mode (Local Storage)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            If checked, data lives in your browser. Uncheck to connect to a real Google Apps Script backend.
          </p>
        </div>

        {!useMock && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GAS Web App URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-yellow-600 mt-1">
              Ensure your script is deployed as "Web App" with access set to "Anyone" or handle CORS/Auth appropriately.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Save & Reload
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;