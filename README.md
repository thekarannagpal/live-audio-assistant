# TwinMind Live Demo (Audio Assistant)

This is a Vite + React web application built as a live audio assistant that transcribes speech, generates live suggestions based on context, and acts as an intelligent sidekick chat.

## Tech Stack
- React
- Vite
- Vanilla CSS (Glassmorphism + Dark Mode)
- `lucide-react` for iconography
- Groq API (`whisper-large-v3` for transcription, `llama3-70b-8192` for generation)

## Local Development
1. Run `npm install` to install dependencies.
2. Run `npm run dev` to start the frontend server locally. (You can also use `vite` directly).
3. Open `http://localhost:5173/` in your browser. Note: The app relies on the `MediaRecorder` API, so you must access it via `localhost` or served over `https`.
4. Open the Settings panel (top right) and paste your Groq API key.

## System Architecture & Trade-Offs

**No-Backend Strategy**: 
This app does not have a custom backend. All the requests to Groq API are made directly from the browser for simplicity entirely in the client-side. The user's API key is stored safely in `localStorage` in the browser. While a production deployment would require an intermediate server-side layer to hide the API credentials and manage abuse, this architecture was chosen for maximum deployability and reduced complexity for a prototype setting.

**Audio Chunking Strategy (Latency vs API Cost)**: 
The `MediaRecorder` API snapshots voice data and sends it to Groq Whisper. This interval is set to **7 seconds**. While chunking every 1-2 seconds (or using proper WebSockets) would offer true real-time transcription, it causes rapid exhaustion of Groq's API rate limits and can lead to duplicated words at chunk boundaries. Therefore, 7 seconds provides a comfortable balance between low-latency UX and rate limit safety.

**Prompt Strategy**: 
The `llama3-70b-8192` model was selected as the default LLM. It strikes an excellent balance of speed and instruction adherence. The "Live Suggestions" prompt forces the LLM to yield output in a reliable JSON structure containing distinct types of actionables ("Strategic Angles", "Fact Checks", "Follow-Up Questions"). It strictly bounds the output to be heavily context-aware rather than generic pleasantries.

**Streaming Response (UX)**:
When interacting with the Chat column, interactions are fully streamed chunk-by-chunk via Server Sent Events from the Groq API. Rather than the user waiting ~2-3 seconds for a block response, the Time-to-First-Token is perceptually instantaneous, yielding a much higher quality conversational feel.

## Deployment Instructions

### Deploying to Vercel
1. Install Vercel CLI if you haven't: `npm i -g vercel`
2. Run `vercel` from the root directory of this repository.
3. Keep the defaults. The platform will automatically detect Vite and set the build command to `npm run build` and output directory to `dist`.

### Deploying to Netlify
1. Drag and drop the codebase or connect your GitHub repository through the Netlify dashboard.
2. Build command: `npm run build`
3. Publish directory: `dist`

### Deploying to Replit
1. Import this repository into Replit.
2. Replit will automatically detect the Vite config and create a run button. If it asks you for the run command, provide: `npm run dev -- --host 0.0.0.0` or `npm run build && npm run preview`. Ensure it connects via HTTPS so microphone permissions are allowed.
