import React from 'react';
import { X } from 'lucide-react';

export default function SettingsModal({ settings, setSettings, onClose }) {
  const handleChange = (k, v) => setSettings(prev => ({ ...prev, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in">
        <div className="modal-header">
          <span>Settings</span>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={20} />
          </button>
        </div>

        <div className="form-group">
          <label>Groq API Key</label>
          <input
            type="password"
            className="form-control"
            value={settings.apiKey}
            onChange={(e) => handleChange("apiKey", e.target.value)}
            placeholder="gsk_..."
          />
        </div>

        <div className="form-group">
          <label>Audio Transcription Model</label>
          <input
            type="text"
            className="form-control"
            value={settings.transcribeModel}
            onChange={(e) => handleChange("transcribeModel", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>LLM Content Model (Suggestions & Chat)</label>
          <input
            type="text"
            className="form-control"
            value={settings.llmModel}
            onChange={(e) => handleChange("llmModel", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Live Suggestion System Prompt</label>
          <textarea
            className="form-control"
            value={settings.suggestionPrompt}
            onChange={(e) => handleChange("suggestionPrompt", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Answers / Chat System Prompt</label>
          <textarea
            className="form-control"
            value={settings.chatPrompt}
            onChange={(e) => handleChange("chatPrompt", e.target.value)}
          />
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
