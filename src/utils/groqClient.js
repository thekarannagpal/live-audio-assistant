export const GROQ_API_URL = "https://api.groq.com/openai/v1";

export async function transcribeAudio(audioBlob, apiKey, model = "whisper-large-v3") {
  if (!apiKey) throw new Error("No API key provided. Please check Settings.");
  
  const formData = new FormData();
  // Groq requires a file extension in the filename
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", model);
  formData.append("response_format", "json");

  const res = await fetch(`${GROQ_API_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Transcription failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.text;
}

export async function generateSuggestions(transcript, prompt, apiKey, model = "gpt-oss-120b") {
  if (!apiKey) throw new Error("No API key provided.");
  if (!transcript.trim()) return [];

  // System prompt instructs the model to return a JSON array of exactly 3 objects.
  const systemPrompt = `
${prompt}
You MUST return EXACTLY 3 suggestions in a raw JSON array format without markdown wrappers. 
Each object in the array should have exactly these keys: 
- "type": (e.g. "Question", "Talking Point", "Fact Check", "Clarification")
- "preview": (A short 1-sentence useful preview string)
- "detailedPrompt": (The payload string to be sent to the chat model if the user clicks this suggestion. It should be written as a query from the user's perspective, or an instruction for the assistant to expand on).
Example:
[
  { "type": "Talking Point", "preview": "Ask about their Q3 roadmap.", "detailedPrompt": "Based on what was just said, what are good follow up questions about the Q3 roadmap?" },
  ...
]
`;

  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the recent transcript context:\n\n${transcript}` }
      ],
      temperature: 0.5,
      max_tokens: 1024,
      response_format: { type: "json_object" } // Assuming Groq supports this for Llama3 models conditionally, if not we will parse manually.
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Suggestions API failed: ${res.statusText}`);
  }

  const data = await res.json();
  const content = data.choices[0]?.message?.content || "[]";
  
  try {
    let parsed = [];
    // Clean up potential markdown from models that don't respect json_object natively perfectly
    const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
    // Sometimes it wraps in a root object if response_format object is used, e.g. {"suggestions": [...]}
    const parsedRaw = JSON.parse(cleaned);
    if (Array.isArray(parsedRaw)) {
      parsed = parsedRaw;
    } else if (parsedRaw.suggestions && Array.isArray(parsedRaw.suggestions)) {
      parsed = parsedRaw.suggestions;
    } else {
      // Find the first array in the object values
      const val = Object.values(parsedRaw).find(v => Array.isArray(v));
      if (val) parsed = val;
    }
    return parsed.slice(0, 3);
  } catch (e) {
    console.error("Failed to parse suggestions JSON:", e, content);
    return [];
  }
}

export async function* sendChatMessageStream(messages, apiKey, model = "llama3-70b-8192") {
  if (!apiKey) throw new Error("No API key provided.");

  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Chat API failed: ${res.statusText} - ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      const chunkText = decoder.decode(value, { stream: true });
      const lines = chunkText.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          if (dataStr.trim() === "[DONE]") return;
          try {
            const data = JSON.parse(dataStr);
            const token = data.choices[0]?.delta?.content;
            if (token) {
              yield token;
            }
          } catch (e) {
            // Ignore partial parse errors that happen if a chunk splits a JSON object
          }
        }
      }
    }
  }
}
