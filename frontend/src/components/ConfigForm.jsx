// src/components/ConfigForm.jsx
import React, { useState } from 'react';

const ConfigForm = ({ onSave }) => {
  const [config, setConfig] = useState({
    database: {
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      user: '',
      password: '',
      database: '',
      ssl: false
    },
    ai: {
      provider: 'claude',
      apiKey: '',
      model: '',
      temperature: 0,
      maxTokens: 1000
    }
  });

  const handleChange = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(config);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Configuration</h2>

      <form onSubmit={handleSubmit}>
        {/* Database Configuration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Database Settings</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                className="w-full p-2 border rounded"
                value={config.database.type}
                onChange={(e) => handleChange('database', 'type', e.target.value)}
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Host</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={config.database.host}
                onChange={(e) => handleChange('database', 'host', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Port</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={config.database.port}
                onChange={(e) => handleChange('database', 'port', parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Database Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={config.database.database}
                onChange={(e) => handleChange('database', 'database', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={config.database.user}
                onChange={(e) => handleChange('database', 'user', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                className="w-full p-2 border rounded"
                value={config.database.password}
                onChange={(e) => handleChange('database', 'password', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={config.database.ssl}
                  onChange={(e) => handleChange('database', 'ssl', e.target.checked)}
                />
                <span className="text-sm">Enable SSL</span>
              </label>
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">AI Settings</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider</label>
              <select
                className="w-full p-2 border rounded"
                value={config.ai.provider}
                onChange={(e) => handleChange('ai', 'provider', e.target.value)}
              >
                <option value="claude">Claude</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="password"
                className="w-full p-2 border rounded"
                value={config.ai.apiKey}
                onChange={(e) => handleChange('ai', 'apiKey', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={config.ai.model}
                onChange={(e) => handleChange('ai', 'model', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                className="w-full p-2 border rounded"
                value={config.ai.temperature}
                onChange={(e) => handleChange('ai', 'temperature', parseFloat(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Tokens</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={config.ai.maxTokens}
                onChange={(e) => handleChange('ai', 'maxTokens', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          Save Configuration
        </button>
      </form>
    </div>
  );
};

export default ConfigForm;