import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { sendChatMessageStream } from '../utils/groqClient';
import { v4 as uuidv4 } from 'uuid';

export default function ChatColumn({ chatMessages, setChatMessages, transcriptChunks, settings, triggerText, onTriggerProcessed }) {
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (bottomRef.current && autoScrollRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isTyping]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // If within 100px of bottom, stick to bottom. Otherwise, user has scrolled up.
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    if (triggerText) {
      handleSend(triggerText);
      if (onTriggerProcessed) onTriggerProcessed();
    }
  }, [triggerText]);

  const handleSend = async (textOverride = null) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;
    if (!settings.apiKey) {
      alert("API key required. Check Settings.");
      return;
    }

    if (!textOverride) setInputText("");

    const newUserMsg = { id: uuidv4(), role: "user", content: textToSend };
    setChatMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);
    autoScrollRef.current = true; // Auto-scroll on new message

    try {
      const contextText = transcriptChunks.slice(-60).map(c => `[${c.timestamp}] ${c.text}`).join("\n");
      const systemMessage = { 
        role: "system", 
        content: `${settings.chatPrompt}\n\nRecent Transcript Context:\n${contextText}` 
      };

      const historyForApi = chatMessages.map(m => ({ role: m.role, content: m.content }));
      const apiMessages = [systemMessage, ...historyForApi, { role: "user", content: textToSend }];

      const assistantId = uuidv4();
      setChatMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      
      const stream = sendChatMessageStream(apiMessages, settings.apiKey, settings.llmModel);
      for await (const chunk of stream) {
        setChatMessages(prev => 
          prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
      }
    } catch (e) {
      console.error("Chat error:", e);
      setChatMessages(prev => [...prev, { id: uuidv4(), role: "assistant", content: `API Error: ${e.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const formatContent = (content) => {
    // Basic cleanup: some models return <br> tags instead of standard markdown newlines
    return content.replace(/<br\s*\/?>/gi, '\n');
  };

  return (
    <div className="column">
      <div className="column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={18} style={{ color: 'var(--accent-color)' }} />
          Details & Chat
        </div>
      </div>

      <div className="column-body" style={{ flex: 1, paddingBottom: 0 }} onScroll={handleScroll}>
        {chatMessages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '40px', padding: '0 20px' }}>
            Click a live suggestion to expand upon it, or ask a custom question about the conversation below.
          </div>
        ) : (
          chatMessages.map(msg => (
            <div key={msg.id} className={`chat-message ${msg.role}`} style={{ whiteSpace: 'pre-wrap' }}>
              {msg.role === 'assistant' ? (
                <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 4, color: 'var(--accent-color)' }}>
                  Assistant
                </div>
              ) : null}
              {formatContent(msg.content)}
            </div>
          ))
        )}
        {isTyping && (
           <div className="chat-message assistant animate-fade-in" style={{ fontStyle: 'italic', opacity: 0.7 }}>
             Thinking...
           </div>
        )}
        <div ref={bottomRef} style={{ height: 20 }} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-box">
          <input 
            type="text" 
            placeholder="Ask a question about the conversation..." 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button onClick={() => handleSend()} disabled={isTyping || !inputText.trim()}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
