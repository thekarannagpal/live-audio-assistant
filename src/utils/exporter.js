export function exportSession(transcriptChunks, suggestionBatches, chatMessages) {
  const sessionData = {
    exportedAt: new Date().toISOString(),
    transcript: transcriptChunks.map(c => ({
      timestamp: c.timestamp,
      text: c.text
    })),
    suggestionBatches: suggestionBatches.map(b => ({
      timestamp: b.timestamp,
      suggestions: b.suggestions
    })),
    chatHistory: chatMessages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || new Date().toISOString()
    }))
  };

  const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `live-session-export-${new Date().getTime()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}
