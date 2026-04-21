import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, RefreshCw } from 'lucide-react';
import { transcribeAudio } from '../utils/groqClient';
import { v4 as uuidv4 } from 'uuid';

export default function TranscriptColumn({ transcriptChunks, setTranscriptChunks, settings }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  
  const bottomRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptChunks]);

  const processAudioChunk = async (audioBlob) => {
    if (audioBlob.size === 0) return;
    try {
      const rawText = await transcribeAudio(audioBlob, settings.apiKey, settings.transcribeModel);
      const text = rawText ? rawText.trim() : "";
      
      // Filter out known Whisper hallucinations caused by silence/noise
      const lowerText = text.toLowerCase();
      const hallucinations = [
        "thank you.", "thank you", "thanks.", "thanks", "thank you!", 
        "thank you very much.", "thank you for watching.", "thank you for watching", 
        "subtitles by amara.org", "you", "...", ".", "thank you so much.", "bye."
      ];
      
      if (text && !hallucinations.includes(lowerText)) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' });
        setTranscriptChunks(prev => [...prev, { id: uuidv4(), timestamp: time, text: text }]);
      }
    } catch (e) {
      console.error("Transcription error:", e);
      // Let it slip gracefully or show toast
    }
  };

  const startRecording = async () => {
    if (!settings.apiKey) {
      alert("Please configure your Groq API key in Settings first.");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsRecording(true);
      
      startChunkCycle();
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Microphone access is required.");
    }
  };

  const startChunkCycle = () => {
    if (!streamRef.current) return;
    
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      processAudioChunk(audioBlob);
      
      // If we are still supposed to be recording, start again instantly
      if (streamRef.current) {
        startChunkCycle();
      }
    };
    
    mediaRecorder.start();
    
    // Stop and restart every 7 seconds to send chunks
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, 7000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="column">
      <div className="column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mic size={18} className={isRecording ? 'mic-active' : ''} />
          Transcript
        </div>
        <button onClick={toggleMic} className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}>
          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          {isRecording ? 'Stop Mic' : 'Start Mic'}
        </button>
      </div>
      
      <div className="column-body">
        {transcriptChunks.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '40px' }}>
            No transcript yet. Press "Start Mic" to begin.
          </div>
        ) : (
          transcriptChunks.map(chunk => (
            <div key={chunk.id} className="transcript-line animate-fade-in">
              <span className="time">[{chunk.timestamp}]</span>
              {chunk.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
