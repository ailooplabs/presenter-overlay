import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../services/aiService';

// Extend window for webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  
  const transcriptRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackIntervalRef = useRef<any>(null);
  const isFallbackModeRef = useRef(false);

  // Sync transcript ref to avoid stale closures
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Determine speech recognition support
  const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  // Force false to prevent macOS system beep sounds triggered by native webkitSpeechRecognition
  const isSpeechRecognitionSupported = false;

  const createRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let currentSessionTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentSessionTranscript += event.results[i][0].transcript + ' ';
      }
      const fullTranscript = (accumulatedTranscriptRef.current + ' ' + currentSessionTranscript).trim();
      setTranscript(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access denied. Please allow microphone permission in System Settings > Privacy & Security > Microphone.');
        shouldListenRef.current = false;
        setIsListening(false);
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Speech error: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Save current session's final result into the accumulated base
      accumulatedTranscriptRef.current = transcriptRef.current;
      
      // Auto-restart if we are supposed to still be listening
      if (shouldListenRef.current) {
        try {
          setTimeout(() => {
            if (shouldListenRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 200);
        } catch (e) {
          console.error('Error restarting recognition', e);
        }
      }
    };

    return recognition;
  }, [SpeechRecognition]);

  const getSupportedMimeType = () => {
    const types = ['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav'];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startFallbackRecording = (stream: MediaStream, key: string) => {
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setError('No supported audio recording format found in this browser.');
      setIsListening(false);
      shouldListenRef.current = false;
      return;
    }

    let currentRecorder: MediaRecorder | null = null;

    const recordChunk = () => {
      if (!shouldListenRef.current) return;

      const localChunks: Blob[] = [];
      try {
        const currentRecorderInstance = new MediaRecorder(stream, { mimeType });
        currentRecorder = currentRecorderInstance;
        recorderRef.current = currentRecorderInstance;

        currentRecorderInstance.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            localChunks.push(e.data);
          }
        };

        currentRecorderInstance.onstop = async () => {
          const audioBlob = new Blob(localChunks, { type: mimeType });
          if (audioBlob.size > 500) {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64data = reader.result as string;
              const base64Raw = base64data.split(',')[1];
              try {
                const text = await transcribeAudio(key, base64Raw, mimeType);
                if (text) {
                  setTranscript(prev => (prev + ' ' + text).trim());
                }
              } catch (err) {
                console.error('Fallback transcription failed:', err);
              }
            };
          }
        };

        currentRecorderInstance.start();
      } catch (e) {
        console.error('Error starting fallback recording chunk:', e);
      }
    };

    // Start first chunk
    recordChunk();

    // Set up interval to cycle recorders every 7 seconds
    const intervalId = setInterval(() => {
      if (currentRecorder && currentRecorder.state === 'recording') {
        try {
          currentRecorder.stop();
        } catch (e) {
          console.error('Error stopping recorder chunk:', e);
        }
      }
      recordChunk();
    }, 7000);

    fallbackIntervalRef.current = intervalId;
  };

  const startListening = useCallback(async (apiKey?: string) => {
    setError(null);
    
    // Determine whether we need to use fallback mode
    if (!isSpeechRecognitionSupported) {
      if (!apiKey) {
        setError('Gemini API key is required for Speech-to-Text fallback in this environment.');
        return;
      }
      isFallbackModeRef.current = true;
    } else {
      isFallbackModeRef.current = false;
    }
    
    // Request microphone permission via getUserMedia
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      setError('Microphone access denied. Please allow microphone in System Settings > Privacy & Security.');
      return;
    }

    shouldListenRef.current = true;
    setIsListening(true);

    if (isFallbackModeRef.current) {
      streamRef.current = stream;
      startFallbackRecording(stream, apiKey || '');
    } else {
      // Immediately stop the permission stream tracks - we just needed the permission grant for WebKit
      stream.getTracks().forEach(track => track.stop());

      const recognition = createRecognition();
      if (!recognition) {
        setError('Failed to initialize speech recognition.');
        setIsListening(false);
        shouldListenRef.current = false;
        return;
      }

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    }
  }, [createRecognition, isSpeechRecognitionSupported]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch(e) {
        console.error('Error stopping recognition:', e);
      }
      recognitionRef.current = null;
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch(e) {
        console.error('Error stopping fallback recorder:', e);
      }
    }
    recorderRef.current = null;

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('Error stopping stream tracks:', e);
      }
      streamRef.current = null;
    }

    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  const clearTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = '';
    setTranscript('');
  }, []);

  // Clean up timers/recorders on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop(); } catch(e) {}
      }
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(track => track.stop()); } catch(e) {}
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    isNativeSupported: isSpeechRecognitionSupported
  };
}

