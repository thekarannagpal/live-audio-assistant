import React, { useEffect, useRef, useState } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { generateSuggestions } from '../utils/groqClient';
import { v4 as uuidv4 } from 'uuid';

export default function SuggestionsColumn({ transcriptChunks, suggestionBatches, setSuggestionBatches, onSuggestionClick, settings }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const lastTranscriptLengthProcessed = useRef(0);

  const requestSuggestions = async (manual = false) => {
    if (!settings.apiKey) return;
    if (isGenerating) return;
    
    // Combine at most the last 30 chunks for context
    const recentChunks = transcriptChunks.slice(-30);
    const contextText = recentChunks.map(c => c.text).join(" ");
    
    // Only generate if we have new transcript or it's manual
    if (!manual && transcriptChunks.length === lastTranscriptLengthProcessed.current) {
      return; 
    }
    
    if (!contextText.trim()) return;

    setIsGenerating(true);
    try {
      const suggestions = await generateSuggestions(contextText, settings.suggestionPrompt, settings.apiKey, settings.llmModel);
      
      if (suggestions && suggestions.length > 0) {
        lastTranscriptLengthProcessed.current = transcriptChunks.length;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
        
        setSuggestionBatches(prev => [
          { id: uuidv4(), timestamp: time, suggestions },
          ...prev
        ]);
      }
    } catch (e) {
      console.error("Failed to fetch suggestions:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      requestSuggestions();
    }, 30000);
    return () => clearInterval(interval);
  }, [transcriptChunks, isGenerating, settings]);

  return (
    <div className="column" style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
      <div className="column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lightbulb size={18} style={{ color: 'var(--accent-color)' }} />
          Live Suggestions
        </div>
        <button 
          onClick={() => requestSuggestions(true)} 
          className="btn"
          disabled={isGenerating}
          style={{ padding: '6px 12px' }}
        >
          <RefreshCw size={14} className={isGenerating ? "spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="column-body">
        {suggestionBatches.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '40px' }}>
            Suggestions will appear here automatically every 30s as you speak.
          </div>
        ) : (
          suggestionBatches.map(batch => (
            <div key={batch.id} className="suggestion-batch animate-fade-in">
              <div className="batch-time">{batch.timestamp}</div>
              {batch.suggestions.map((sug, idx) => (
                <div 
                  key={idx} 
                  className="glass-card suggestion-card"
                  onClick={() => onSuggestionClick(sug)}
                >
                  <div className="suggestion-type">{sug.type}</div>
                  <div className="suggestion-text">{sug.preview}</div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
