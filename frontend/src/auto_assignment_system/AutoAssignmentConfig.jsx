import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiSettings, FiUsers, FiZap, FiCpu, FiTrendingUp, FiCheck, 
  FiX, FiEdit2, FiTrash2, FiPlus, FiSave, FiAlertCircle 
} from 'react-icons/fi';
import api from '../api/axios';

const AutoAssignmentConfig = () => {
  const [config, setConfig] = useState(null);
  const [rules, setRules] = useState([]);
  const [skills, setSkills] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('config');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, rulesRes, skillsRes, availRes] = await Promise.all([
        api.get('/api/auto-assignment/config'),
        api.get('/api/auto-assignment/rules'),
        api.get('/api/auto-assignment/skills'),
        api.get('/api/auto-assignment/availability')
      ]);

      setConfig(configRes.data);
      setRules(rulesRes.data);
      setSkills(skillsRes.data);
      setAvailability(availRes.data);
      setFormData(configRes.data);
    } catch (error) {
      console.error('Failed to fetch auto-assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async () => {
    try {
      await api.put('/api/auto-assignment/config', formData);
      setConfig(formData);
      setEditMode(false);
      alert('Configuration updated successfully!');
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('Failed to update configuration');
    }
  };

  const tabs = [
    { id: 'config', label: 'Global Configuration', icon: FiSettings },
    { id: 'rules', label: 'Assignment Rules', icon: FiCpu },
    { id: 'skills', label: 'Technician Skills', icon: FiZap },
    { id: 'availability', label: 'Availability', icon: FiUsers },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
                <FiCpu className="text-indigo-600" />
                Auto-Assignment System
              </h1>
              <p className="text-gray-600">
                Intelligent ticket routing with AI-powered technician matching
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full font-bold ${
                config?.is_enabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {config?.is_enabled ? '● Active' : '● Inactive'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-lg'
                  : 'bg-white/50 text-gray-600 hover:bg-white/80'
              }`}
            >
              <tab.icon />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {activeTab === 'config' && (
            <ConfigTab 
              config={config} 
              formData={formData}
              setFormData={setFormData}
              editMode={editMode}
              setEditMode={setEditMode}
              onSave={handleConfigUpdate}
            />
          )}
          
          {activeTab === 'rules' && (
            <RulesTab rules={rules} onRefresh={fetchData} />
          )}
          
          {activeTab === 'skills' && (
            <SkillsTab skills={skills} onRefresh={fetchData} />
          )}
          
          {activeTab === 'availability' && (
            <AvailabilityTab availability={availability} onRefresh={fetchData} />
          )}
        </motion.div>
      </div>
    </div>
  );
};

// Configuration Tab Component
const ConfigTab = ({ config, formData, setFormData, editMode, setEditMode, onSave }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-900">Global Settings</h2>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <FiEdit2 /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FiSave /> Save
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <FiX /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Enable/Disable Toggle */}
      <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="font-bold text-gray-900">Enable Auto-Assignment</h3>
            <p className="text-sm text-gray-600">Automatically assign new tickets to technicians</p>
          </div>
          <input
            type="checkbox"
            checked={formData.is_enabled || false}
            disabled={!editMode}
            onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
            className="w-12 h-6 rounded-full appearance-none bg-gray-300 checked:bg-indigo-600 relative transition-all cursor-pointer disabled:opacity-50"
          />
        </label>
      </div>

      {/* Strategy Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Default Strategy
          </label>
          <select
            value={formData.default_strategy || 'balanced'}
            disabled={!editMode}
            onChange={(e) => setFormData({ ...formData, default_strategy: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          >
            <option value="balanced">Balanced (Recommended)</option>
            <option value="skill_match">Skill Match Priority</option>
            <option value="least_busy">Least Busy Technician</option>
            <option value="round_robin">Round Robin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Fallback Manager
          </label>
          <input
            type="number"
            value={formData.manager_id || ''}
            disabled={!editMode}
            onChange={(e) => setFormData({ ...formData, manager_id: parseInt(e.target.value) })}
            placeholder="Manager User ID"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Scoring Weights */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Scoring Weights (Total: 100%)</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Skill Match Weight: {formData.skill_weight || 0}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.skill_weight || 0}
              disabled={!editMode}
              onChange={(e) => setFormData({ ...formData, skill_weight: parseInt(e.target.value) })}
              className="w-full disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Workload Weight: {formData.workload_weight || 0}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.workload_weight || 0}
              disabled={!editMode}
              onChange={(e) => setFormData({ ...formData, workload_weight: parseInt(e.target.value) })}
              className="w-full disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Performance Weight: {formData.performance_weight || 0}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.performance_weight || 0}
              disabled={!editMode}
              onChange={(e) => setFormData({ ...formData, performance_weight: parseInt(e.target.value) })}
              className="w-full disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Location Weight: {formData.location_weight || 0}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.location_weight || 0}
              disabled={!editMode}
              onChange={(e) => setFormData({ ...formData, location_weight: parseInt(e.target.value) })}
              className="w-full disabled:opacity-50"
            />
          </div>
        </div>

        {/* Total Check */}
        {editMode && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <FiAlertCircle className="inline mr-2" />
              Total Weight: {(formData.skill_weight || 0) + (formData.workload_weight || 0) + 
                (formData.performance_weight || 0) + (formData.location_weight || 0)}%
              {((formData.skill_weight || 0) + (formData.workload_weight || 0) + 
                (formData.performance_weight || 0) + (formData.location_weight || 0)) !== 100 && 
                ' (Should equal 100%)'}
            </p>
          </div>
        )}
      </div>

      {/* Additional Settings */}
      <div className="grid grid-cols-2 gap-4 border-t pt-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.prevent_overload || false}
            disabled={!editMode}
            onChange={(e) => setFormData({ ...formData, prevent_overload: e.target.checked })}
            className="w-5 h-5 text-indigo-600 rounded disabled:opacity-50"
          />
          <span className="text-sm font-medium text-gray-700">Prevent Technician Overload</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.respect_working_hours || false}
            disabled={!editMode}
            onChange={(e) => setFormData({ ...formData, respect_working_hours: e.target.checked })}
            className="w-5 h-5 text-indigo-600 rounded disabled:opacity-50"
          />
          <span className="text-sm font-medium text-gray-700">Respect Working Hours</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.notify_tech_via_email || false}
            disabled={!editMode}
            onChange={(e) => setFormData({ ...formData, notify_tech_via_email: e.target.checked })}
            className="w-5 h-5 text-indigo-600 rounded disabled:opacity-50"
          />
          <span className="text-sm font-medium text-gray-700">Email Notifications</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.notify_tech_via_sms || false}
            disabled={!editMode}
            onChange={(e) => setFormData({ ...formData, notify_tech_via_sms: e.target.checked })}
            className="w-5 h-5 text-indigo-600 rounded disabled:opacity-50"
          />
          <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
        </label>
      </div>
    </div>
  );
};

// Rules Tab Component
const RulesTab = ({ rules, onRefresh }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-900">Assignment Rules</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <FiPlus /> Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FiCpu className="mx-auto text-6xl mb-4 opacity-20" />
          <p>No assignment rules configured yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{rule.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                      Priority: {rule.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-700">
                      <strong>Strategy:</strong> {rule.strategy}
                    </span>
                    <span className="text-gray-700">
                      <strong>Max Tickets:</strong> {rule.max_tickets_per_tech}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <FiEdit2 />
                  </button>
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Skills Tab Component
const SkillsTab = ({ skills, onRefresh }) => {
  // Group skills by user
  const skillsByUser = skills.reduce((acc, skill) => {
    if (!acc[skill.user_id]) {
      acc[skill.user_id] = [];
    }
    acc[skill.user_id].push(skill);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-900">Technician Skills</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <FiPlus /> Add Skill
        </button>
      </div>

      {Object.keys(skillsByUser).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FiZap className="mx-auto text-6xl mb-4 opacity-20" />
          <p>No technician skills configured yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(skillsByUser).map(([userId, userSkills]) => (
            <div key={userId} className="p-6 border border-gray-200 rounded-xl">
              <h3 className="font-bold text-gray-900 mb-4">Technician ID: {userId}</h3>
              <div className="space-y-3">
                {userSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{skill.skill_name}</span>
                      {skill.is_certified && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          <FiCheck className="inline" /> Certified
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full ${
                            i < skill.proficiency_level ? 'bg-indigo-600' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Availability Tab Component
const AvailabilityTab = ({ availability, onRefresh }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 mb-6">Technician Availability</h2>

      {availability.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FiUsers className="mx-auto text-6xl mb-4 opacity-20" />
          <p>No availability records found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availability.map((avail) => (
            <div key={avail.id} className="p-6 border border-gray-200 rounded-xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-900">Technician ID: {avail.user_id}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  avail.status === 'available' ? 'bg-green-100 text-green-700' :
                  avail.status === 'busy' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {avail.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Tickets:</span>
                  <span className="font-bold text-gray-900">{avail.active_tickets} / {avail.max_capacity}</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (avail.active_tickets / avail.max_capacity) * 100 > 80 
                        ? 'bg-red-500' 
                        : (avail.active_tickets / avail.max_capacity) * 100 > 50 
                        ? 'bg-amber-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${(avail.active_tickets / avail.max_capacity) * 100}%` }}
                  />
                </div>

                {avail.current_location && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-gray-900">{avail.current_location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoAssignmentConfig;
