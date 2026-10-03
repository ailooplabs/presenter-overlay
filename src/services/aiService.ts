import { GoogleGenerativeAI } from '@google/generative-ai';

export const askGemini = async (
  apiKey: string,
  contextTranscript: string,
  audienceQuestion: string
): Promise<string> => {
  if (!apiKey) {
    throw new Error('Gemini API Key is required.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are a live presentation assistant helping a speaker answer an audience question. 
Below is the transcript of what the speaker has been saying during their demo/presentation so far.
Use this context to inform your answer. Your answer must be concise, accurate, and easy for the speaker to read and repeat live.
Do not say "Based on the transcript" or anything similar. Just give the answer directly.

Context Transcript:
"""
${contextTranscript || "No context provided."}
"""

Audience Question:
"${audienceQuestion}"
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Error calling Gemini:', error);
    throw new Error(error.message || 'Failed to generate answer.');
  }
};

export const transcribeAudio = async (
  apiKey: string,
  base64Audio: string,
  mimeType: string
): Promise<string> => {
  if (!apiKey) {
    throw new Error('Gemini API Key is required.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash which has low latency and supports audio input natively
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = "Transcribe the spoken words in this audio clip. Output ONLY the transcription text, with no extra commentary, explanations, or formatting. If there is no speech or only noise, output absolutely nothing.";

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType
        }
      },
      prompt
    ]);
    
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    console.error('Error calling Gemini for transcription:', error);
    throw new Error(error.message || 'Failed to transcribe audio.');
  }
};

