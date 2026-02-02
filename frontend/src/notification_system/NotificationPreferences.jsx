import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const NotificationPreferences = () => {
  const { api } = useAuth();
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const channels = [
    { value: 'email', label: 'Email', icon: '✉️' },
    { value: 'sms', label: 'SMS', icon: '📱' },
    { value: 'push', label: 'Push Notifications', icon: '🔔' },
    { value: 'in_app', label: 'In-App', icon: '💻' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/preferences');
      setPreferences(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load notification preferences');
      console.error('Error fetching preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (channel, field, value) => {
    setSaving(true);
    
    try {
      const pref = preferences.find(p => p.channel === channel);
      const updatedPref = {
        ...pref,
        [field]: value,
        priority_threshold: field === 'priority_threshold' ? value : pref?.priority_threshold || 'normal',
        is_enabled: field === 'is_enabled' ? value : pref?.is_enabled ?? true
      };

      await api.post('/notifications/preferences', {
        channel: updatedPref.channel,
        is_enabled: updatedPref.is_enabled,
        priority_threshold: updatedPref.priority_threshold
      });

      // Update local state
      setPreferences(prev => {
        const existingIndex = prev.findIndex(p => p.channel === channel);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = updatedPref;
          return updated;
        } else {
          return [...prev, updatedPref];
        }
      });
      
      setError(null);
    } catch (err) {
      setError(`Failed to update ${channel} preferences`);
      console.error(`Error updating ${channel} preferences:`, err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Notification Preferences</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Manage Your Notification Preferences</h2>
        
        <div className="space-y-6">
          {channels.map(channel => {
            const pref = preferences.find(p => p.channel === channel.value) || {
              channel: channel.value,
              is_enabled: true,
              priority_threshold: 'normal'
            };
            
            return (
              <div key={channel.value} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">{channel.icon}</span>
                  <h3 className="text-lg font-medium text-gray-900">{channel.label}</h3>
                  <label className="ml-auto flex items-center cursor-pointer">
                    <span className={`mr-3 text-sm font-medium ${pref.is_enabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {pref.is_enabled ? 'On' : 'Off'}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={pref.is_enabled}
                        onChange={(e) => handlePreferenceChange(channel.value, 'is_enabled', e.target.checked)}
                        className="sr-only"
                      />
                      <div 
                        className={`block w-14 h-8 rounded-full transition-colors ${pref.is_enabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                      ></div>
                      <div 
                        className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${pref.is_enabled ? 'transform translate-x-6' : ''}`}
                      ></div>
                    </div>
                  </label>
                </div>
                
                <div className="ml-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum priority to receive notifications
                  </label>
                  <select
                    value={pref.priority_threshold}
                    onChange={(e) => handlePreferenceChange(channel.value, 'priority_threshold', e.target.value)}
                    disabled={!pref.is_enabled}
                    className={`w-full md:w-64 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !pref.is_enabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                    }`}
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    You will only receive {channel.label.toLowerCase()} notifications with priority 
                    <span className="font-medium"> {pref.priority_threshold} </span>
                    or higher.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {saving && (
          <div className="mt-6 flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 mr-2 border-b-2 border-blue-500"></div>
            Saving preferences...
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">About Notification Preferences</h2>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            <span><strong>Email:</strong> Important updates and detailed notifications</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            <span><strong>SMS:</strong> Critical alerts when email isn't accessible</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            <span><strong>Push:</strong> Instant notifications on your mobile device</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            <span><strong>In-App:</strong> Notifications within the application interface</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationPreferences;