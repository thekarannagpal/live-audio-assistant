import React, { useState, useEffect, useRef } from 'react';
import { Settings, Download, Headphones } from 'lucide-react';
import TranscriptColumn from './components/TranscriptColumn';
import SuggestionsColumn from './components/SuggestionsColumn';
import ChatColumn from './components/ChatColumn';
import SettingsModal from './components/SettingsModal';
import { exportSession } from './utils/exporter';

const DEFAULT_SETTINGS = {
  apiKey: "",
  transcribeModel: "whisper-large-v3",
  llmModel: "llama-3.3-70b-versatile",
  suggestionPrompt: "You are an expert AI meeting Copilot analyzing a live conversation. Your goal is to surface 3 HIGHLY ACTIONABLE and VALUABLE insights based on the recent transcript. Provide:\n1. A piercing follow-up question that drives the conversation forward.\n2. A strategic talking point or actionable advice.\n3. A crucial fact-check, summary, or clarification of complex specifics.\nBe extremely concise (limit previews to 1 short sentence). Avoid generic statements.",
  chatPrompt: "You are a concise, highly insightful AI assistant analyzing an ongoing live transcript. When answering user queries or expanding on suggestions, rely strictly on the provided Context. Do not hallucinate. Provide direct, high-value answers."
};

function App() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('liveAudioSettings');
    let parsedSettings = saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    
    // Auto-migrate old/deprecated models in localStorage to the current standard
    if (parsedSettings.llmModel === 'llama3-70b-8192' || parsedSettings.llmModel === 'openai/gpt-oss-120b' || parsedSettings.llmModel === 'gpt-oss-120b') {
      parsedSettings.llmModel = 'llama-3.3-70b-versatile';
    }
    
    return parsedSettings;
  });

  const [showSettings, setShowSettings] = useState(false);

  // Global State
  const [transcriptChunks, setTranscriptChunks] = useState([]);
  const [suggestionBatches, setSuggestionBatches] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  const [chatTrigger, setChatTrigger] = useState(null);

  useEffect(() => {
    localStorage.setItem('liveAudioSettings', JSON.stringify(settings));
  }, [settings]);

  const handleExport = () => {
    exportSession(transcriptChunks, suggestionBatches, chatMessages);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-title">
          <Headphones style={{ color: 'var(--accent-color)' }} />
          TwinMind Live Demo
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" onClick={handleExport}>
            <Download size={16} />
            Export Session
          </button>
          <button className="btn" onClick={() => setShowSettings(true)}>
            <Settings size={16} />
            Settings
          </button>
        </div>
      </header>

      <main className="app-content">
        <TranscriptColumn 
          transcriptChunks={transcriptChunks}
          setTranscriptChunks={setTranscriptChunks}
          settings={settings}
        />
        <SuggestionsColumn 
          transcriptChunks={transcriptChunks}
          suggestionBatches={suggestionBatches}
          setSuggestionBatches={setSuggestionBatches}
          onSuggestionClick={(sug) => setChatTrigger(sug.detailedPrompt)}
          settings={settings}
        />
        <ChatColumn 
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          transcriptChunks={transcriptChunks}
          settings={settings}
          triggerText={chatTrigger}
          onTriggerProcessed={() => setChatTrigger(null)}
        />
      </main>

      {showSettings && (
        <SettingsModal 
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

export default App;
