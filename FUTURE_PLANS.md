# Future Plans: Multi-Provider AI Support (OpenAI & Claude)

This document outlines the proposed architecture and steps to extend the Presenter Overlay application to support OpenAI and Anthropic (Claude) API keys as alternative models for the **AI Suggested Answer** and **Speech-to-Text Fallback** features.

---

## 1. User Interface Updates

### Settings Panel (`LiveAssistant.tsx`)
- **Provider Selector**: Add a `<select>` dropdown menu to let the user select their preferred active AI provider:
  - `Gemini (Google)`
  - `OpenAI`
  - `Claude (Anthropic)`
- **Dynamic API Key Inputs**: 
  - Conditionally display the key input field based on the selected provider.
  - Store the active keys in `localStorage` under distinct keys:
    - `gemini-api-key`
    - `openai-api-key`
    - `claude-api-key`
  - Retrieve fallbacks from `.env` environment variables if present (`VITE_GEMINI_API_KEY`, `VITE_OPENAI_API_KEY`, `VITE_CLAUDE_API_KEY`).

---

## 2. API Service Layer Updates (`aiService.ts`)

Instead of hardcoding the Google Generative AI SDK, create a router function that maps to individual API call handlers depending on the active provider.

### Handler Implementations

#### A. OpenAI Handler
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Method**: `POST`
- **Headers**:
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_OPENAI_API_KEY"
  }
  ```
- **Payload** (for questions):
  ```json
  {
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "You are a live presentation assistant..."
      },
      {
        "role": "user",
        "content": "Context Transcript: ...\n\nAudience Question: ..."
      }
    ]
  }
  ```

#### B. Anthropic Claude Handler
- **Endpoint**: `https://api.anthropic.com/v1/messages` (Requires routing via CORS proxy or backend if browser blocks direct request due to security headers, or using Anthropic's SDK if CORS-enabled).
- **Method**: `POST`
- **Headers**:
  ```json
  {
    "content-type": "application/json",
    "x-api-key": "YOUR_CLAUDE_API_KEY",
    "anthropic-version": "2023-06-01",
    "dangerouslyAllowBrowser": true
  }
  ```
- **Payload**:
  ```json
  {
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "You are a live presentation assistant...\n\nContext Transcript: ...\n\nAudience Question: ..."
      }
    ]
  }
  ```

---

## 3. Fallback Speech-to-Text Support

- **Gemini Fallback**: Keep `gemini-2.5-flash` for audio inputs since it natively supports multi-modal audio processing.
- **OpenAI Whisper Fallback**: If OpenAI is selected, route fallback speech transcription to the Audio transcriptions endpoint:
  - **Endpoint**: `https://api.openai.com/v1/audio/transcriptions`
  - **Payload**: Multipart form data with `file` (audio blob) and `model` set to `whisper-1`.
- **Claude**: Claude does not natively support speech-to-text transcription via audio uploads, so fallback mode under Claude could either:
  1. Default to native WebKit speech recognition (if supported by browser/macOS).
  2. Fall back to Gemini/Whisper using their respective keys if provided.

---

## 4. Verification & Testing

- Expand the Vitest mock environments inside `src/App.test.tsx` to stub the HTTP requests to `api.openai.com` and `api.anthropic.com` using `vi.spyOn(global, 'fetch')` or MSW (Mock Service Worker).
