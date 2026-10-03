import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Loader2, Key, X } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { askGemini, transcribeAudio } from '../services/aiService';

const LiveAssistant = ({ fontSize, isBW, fontColor }: { fontSize: number, isBW: boolean, fontColor: string }) => {
  const { 
    isListening, 
    transcript, 
    error: speechError, 
    startListening, 
    stopListening, 
    clearTranscript,
    isNativeSupported 
  } = useSpeechRecognition();
  
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // States and refs for recording the audience question via mic
  const [isRecordingQuestion, setIsRecordingQuestion] = useState(false);
  const [isTranscribingQuestion, setIsTranscribingQuestion] = useState(false);
  const questionRecorderRef = useRef<MediaRecorder | null>(null);
  const questionStreamRef = useRef<MediaStream | null>(null);
  const questionChunksRef = useRef<Blob[]>([]);

  // Cleanup for question recording on unmount
  useEffect(() => {
    return () => {
      if (questionRecorderRef.current && questionRecorderRef.current.state !== 'inactive') {
        try { questionRecorderRef.current.stop(); } catch(e) {}
      }
      if (questionStreamRef.current) {
        try { questionStreamRef.current.getTracks().forEach(track => track.stop()); } catch(e) {}
      }
    };
  }, []);

  // Load API key from local storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini-api-key') || (import.meta.env.VITE_GEMINI_API_KEY as string | undefined);
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setShowSettings(true);
    }
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('gemini-api-key', apiKey);
    setShowSettings(false);
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(apiKey);
    }
  };

  const startRecordingQuestion = async () => {
    setAiError(null);
    questionChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      questionStreamRef.current = stream;
      
      const types = ['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav'];
      let mimeType = '';
      for (const type of types) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      if (!mimeType) {
        setAiError('No supported audio recording format found.');
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      questionRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          questionChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsTranscribingQuestion(true);
        const audioBlob = new Blob(questionChunksRef.current, { type: mimeType });
        if (audioBlob.size > 500) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            const base64Raw = base64data.split(',')[1];
            try {
              const text = await transcribeAudio(apiKey, base64Raw, mimeType);
              if (text) {
                setQuestion(prev => (prev + ' ' + text).trim());
              }
            } catch (err: any) {
              console.error("onloadend: transcription error:", err);
              setAiError('Failed to transcribe: ' + err.message);
            } finally {
              setIsTranscribingQuestion(false);
            }
          };
        } else {
          setIsTranscribingQuestion(false);
        }
      };

      recorder.start();
      setIsRecordingQuestion(true);
    } catch (err: any) {
      console.error("startRecordingQuestion: Error caught:", err);
      setAiError('Microphone access denied: ' + err.message);
    }
  };

  const stopRecordingQuestion = () => {
    if (questionRecorderRef.current && questionRecorderRef.current.state !== 'inactive') {
      try { questionRecorderRef.current.stop(); } catch(e) {}
    }
    if (questionStreamRef.current) {
      try { questionStreamRef.current.getTracks().forEach(track => track.stop()); } catch(e) {}
    }
    setIsRecordingQuestion(false);
  };

  const handleToggleRecordQuestion = () => {
    if (isRecordingQuestion) {
      stopRecordingQuestion();
    } else {
      startRecordingQuestion();
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    setIsAnswering(true);
    setAiError(null);
    try {
      const result = await askGemini(apiKey, transcript, question);
      setAnswer(result);
      setQuestion('');
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute inset-0 z-10 bg-slate-900/95 backdrop-blur-md rounded-lg flex flex-col p-6 items-center justify-center relative">
          {localStorage.getItem('gemini-api-key') && (
            <button 
              onClick={() => setShowSettings(false)} 
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X size={20} />
            </button>
          )}
          <Key className="w-8 h-8 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Gemini API Key</h3>
          <p className={`mb-4 text-center ${isBW ? 'text-gray-400' : 'text-slate-400'}`} style={{ fontSize: `${Math.max(10, fontSize - 4)}px` }}>Your key is stored locally and never sent to our servers.</p>
          <input
            type="password"
            className={`w-full border rounded-md px-3 py-2 mb-4 focus:ring-2 ${isBW ? 'bg-black border-white focus:ring-white' : 'bg-slate-800 border-slate-700 focus:ring-emerald-500'}`}
            style={{ fontSize: `${Math.max(12, fontSize - 2)}px`, color: fontColor !== '#ffffff' ? fontColor : undefined }}
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div className="flex w-full gap-2">
            <button
              onClick={handleSaveKey}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md py-2 font-medium transition-colors"
            >
              Save Key
            </button>
            {localStorage.getItem('gemini-api-key') && (
              <button
                onClick={() => {
                  localStorage.removeItem('gemini-api-key');
                  setApiKey('');
                }}
                className="px-4 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-md py-2 font-medium transition-colors"
              >
                Clear Key
              </button>
            )}
          </div>
        </div>
      )}

      {/* Speech Context Section */}
      <div className={`flex flex-col rounded-xl border p-3 h-1/3 overflow-hidden flex-shrink-0 bg-transparent ${isBW ? 'border-white/20' : 'border-slate-700/50'}`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleListening}
              className={`p-1.5 rounded-full transition-colors ${
                isListening ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : (isBW ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-700 text-slate-400 hover:text-white')
              }`}
            >
              {isListening ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
            </button>
            <h3 className={`font-semibold ${isBW ? 'text-white' : 'text-slate-300'} flex items-center gap-2`} style={{ fontSize: `${Math.max(12, fontSize - 2)}px` }}>
              <span>Live Transcript Context</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                isNativeSupported 
                  ? (isBW ? 'border border-white/30 text-white' : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20') 
                  : (isBW ? 'border border-dashed border-white/30 text-white' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20')
              }`}>
                {isNativeSupported ? 'Native STT' : 'Gemini STT'}
              </span>
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowSettings(true)} 
              className={`hover:text-white flex items-center space-x-1 transition-colors ${isBW ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-200'}`}
              style={{ fontSize: `${Math.max(10, fontSize - 6)}px` }}
              title="Configure Gemini API Key"
            >
              <Key size={11} />
              <span>API Key</span>
            </button>
            <span className={isBW ? 'text-gray-600' : 'text-slate-700'} style={{ fontSize: `${Math.max(10, fontSize - 6)}px` }}>|</span>
            <button onClick={clearTranscript} className={`hover:text-white transition-colors ${isBW ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-200'}`} style={{ fontSize: `${Math.max(10, fontSize - 6)}px` }}>Clear</button>
          </div>
        </div>
        
        {speechError && <div className="text-red-400 mb-2" style={{ fontSize: `${Math.max(12, fontSize - 2)}px` }}>{speechError}</div>}
        
        <div className={`flex-1 overflow-y-auto leading-relaxed custom-scrollbar ${isBW ? 'text-gray-300' : 'text-slate-400'}`} style={{ fontSize: `${fontSize}px` }}>
          {transcript || <span className={`italic ${isBW ? 'text-gray-500' : 'text-slate-600'}`}>Click the microphone to start building presentation context...</span>}
        </div>
      </div>

      {/* AI Answer Section */}
      <div className={`flex-1 flex flex-col rounded-xl border p-3 overflow-hidden relative bg-transparent ${isBW ? 'border-white/20' : 'border-slate-700/50'}`}>
        <h3 className={`font-semibold mb-2 ${isBW ? 'text-white' : 'text-emerald-400'}`} style={{ fontSize: `${Math.max(12, fontSize - 2)}px` }}>AI Suggested Answer</h3>
        
        <div className={`flex-1 overflow-y-auto mb-3 relative ${isBW ? 'text-white' : 'text-slate-200'}`} style={{ fontSize: `${fontSize}px` }}>
          {isAnswering ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className={`w-6 h-6 animate-spin ${isBW ? 'text-white' : 'text-emerald-500'}`} />
            </div>
          ) : answer ? (
            <div className={`border rounded-md p-3 leading-relaxed bg-transparent ${isBW ? 'border-white' : 'border-emerald-500/20'}`}>
              {answer}
            </div>
          ) : (
            <div className={`h-full flex items-center justify-center italic text-center px-4 ${isBW ? 'text-gray-500' : 'text-slate-500'}`}>
              Type an audience question below to get a suggested answer based on your context.
            </div>
          )}
          {aiError && <div className="text-xs text-red-400 mt-2 p-2 bg-red-500/10 rounded">{aiError}</div>}
        </div>

        {/* Input Area */}
        <div className="flex items-center space-x-2 mt-auto">
          <textarea
            rows={2}
            className={`flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 resize-none bg-transparent ${isBW ? 'border-white/30 placeholder-gray-500 focus:ring-white/50' : 'border-slate-700 placeholder-slate-500 focus:ring-emerald-500/50'}`}
            style={{ fontSize: `${Math.max(14, fontSize)}px`, color: fontColor !== '#ffffff' ? fontColor : undefined }}
            placeholder="Audience question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAskQuestion();
              }
            }}
            disabled={isAnswering || isTranscribingQuestion}
          />
          <button
            onClick={handleToggleRecordQuestion}
            disabled={isAnswering || isTranscribingQuestion}
            className={`rounded-xl px-4 py-3 h-full flex items-center transition-colors ${
              isRecordingQuestion
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : isTranscribingQuestion
                ? 'bg-slate-700 text-slate-400'
                : isBW
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title={isRecordingQuestion ? "Stop recording question" : "Record question via mic"}
          >
            {isTranscribingQuestion ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecordingQuestion ? (
              <MicOff size={20} />
            ) : (
              <Mic size={20} />
            )}
          </button>
          <button
            onClick={handleAskQuestion}
            disabled={isAnswering || !question.trim()}
            className={`rounded-xl px-4 py-3 h-full flex items-center transition-colors ${isBW ? 'bg-white text-black hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-500' : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white'}`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveAssistant;
