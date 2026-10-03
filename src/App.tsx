import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, PenTool, MessageSquare, EyeOff, Plus, Minus, X, Droplet } from 'lucide-react';
import './App.css';
import ManualNotes from './components/ManualNotes';
import LiveAssistant from './components/LiveAssistant';

function App() {
  const [activeTab, setActiveTab] = useState<'notes' | 'ai'>('notes');
  const [isHidden, setIsHidden] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [opacity, setOpacity] = useState(30); // Default to very transparent
  const [fontSize, setFontSize] = useState(16);
  const [isBW, setIsBW] = useState(false);
  const [fontColor, setFontColor] = useState('#fef08a'); // Light yellow default
  
  useEffect(() => {
    // Hide window from capture on mount
    invoke('set_window_hidden_from_capture', { hidden: true })
      .then(() => console.log('Window hidden from screen share'))
      .catch((e) => console.error('Failed to hide window:', e));

    // Check if welcome was accepted
    const accepted = localStorage.getItem('presenter-overlay-welcome-accepted');
    if (accepted !== 'true') {
      setShowWelcome(true);
    }
  }, []);

  const toggleHidden = async () => {
    try {
      const newHiddenState = !isHidden;
      await invoke('set_window_hidden_from_capture', { hidden: newHiddenState });
      setIsHidden(newHiddenState);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden p-4 font-sans ${isBW ? 'text-white' : 'text-slate-200'}`} style={{ backgroundColor: 'transparent' }}>
      {/* Draggable Glassmorphic Container */}
      <div 
        className={`flex-1 flex flex-col border rounded-2xl shadow-2xl overflow-hidden ${isBW ? 'border-white/20' : 'border-slate-700/50'}`}
        style={{
          backgroundColor: isBW ? `rgba(0,0,0,${opacity/100})` : `rgba(15, 23, 42, ${opacity/100})`,
          backdropFilter: opacity > 0 ? `blur(${opacity / 10}px)` : 'none',
          color: fontColor !== '#ffffff' ? fontColor : undefined
        }}
      >
        
        {/* Titlebar (Draggable Region) */}
        <div 
          onMouseDown={() => {
            // Unconditional drag on the titlebar background via Rust command
            invoke('start_dragging').catch(console.error);
          }}
          className={`h-10 flex items-center justify-between px-4 border-b cursor-default ${isBW ? 'bg-black/50 border-white/20' : 'bg-slate-800/40 border-slate-700/50'}`}
        >
          <div className="flex items-center space-x-2 pointer-events-none">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className={`ml-2 text-xs font-semibold tracking-wider ${isBW ? 'text-white' : 'text-slate-300'}`}>PRESENTER OVERLAY</span>
          </div>
          <div 
            className="flex items-center space-x-2" 
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button 
              onClick={toggleHidden} 
              title={isHidden ? "Hidden from screenshare" : "Visible in screenshare"}
              className={`p-1.5 rounded-md transition-colors ${isHidden ? (isBW ? 'text-white bg-white/20' : 'text-green-400 bg-green-400/10') : 'text-slate-400 hover:bg-slate-700'}`}
            >
              <EyeOff size={14} />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            >
              <Settings size={14} />
            </button>
            <button 
              onClick={() => invoke('close_window')}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b p-2 space-x-2 ${isBW ? 'bg-black/30 border-white/20' : 'bg-slate-800/20 border-slate-700/50'}`}>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg font-medium transition-all ${activeTab === 'notes' ? (isBW ? 'bg-white/20 text-white border border-white/30 shadow-inner' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner') : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            style={{ fontSize: `${Math.max(12, fontSize - 2)}px` }}
          >
            <PenTool size={16} />
            <span>Manual Notes</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg font-medium transition-all ${activeTab === 'ai' ? (isBW ? 'bg-white/20 text-white border border-white/30 shadow-inner' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-inner') : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            style={{ fontSize: `${Math.max(12, fontSize - 2)}px` }}
          >
            <MessageSquare size={16} />
            <span>Live Demo AI</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 relative">
          {showSettings ? (
            <div className={`absolute inset-0 z-20 flex flex-col p-6 space-y-6 ${isBW ? 'bg-black' : 'bg-slate-900/95'}`}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-800 rounded">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Background Opacity: {opacity}%</label>
                  <Droplet size={16} />
                </div>
                <input 
                  type="range" min="0" max="100" value={opacity} 
                  onChange={(e) => setOpacity(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Font Size: {fontSize}px</label>
                <div className="flex items-center space-x-4">
                  <button onClick={() => setFontSize(f => Math.max(10, f - 2))} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">
                    <Minus size={16} />
                  </button>
                  <span className="text-lg">{fontSize}</span>
                  <button onClick={() => setFontSize(f => Math.min(32, f + 2))} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Font Color</label>
                <div className="flex flex-wrap gap-2">
                  {['#ffffff', '#fef08a', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#fbbf24'].map(color => (
                    <button 
                      key={color}
                      onClick={() => setFontColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${fontColor === color ? 'border-white shadow-lg scale-110' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'} transition-all`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Theme</label>
                <button 
                  onClick={() => setIsBW(!isBW)}
                  className={`w-full py-3 rounded-lg border font-medium ${isBW ? 'bg-white text-black border-white' : 'bg-transparent text-white border-slate-600 hover:border-slate-400'}`}
                >
                  {isBW ? 'High Contrast (B/W) ON' : 'High Contrast (B/W) OFF'}
                </button>
              </div>

              <div className={`space-y-2 pt-2 border-t ${isBW ? 'border-white/20' : 'border-slate-800'}`}>
                <button 
                  onClick={() => {
                    setShowSettings(false);
                    setShowWelcome(true);
                  }}
                  className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${isBW ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                >
                  View Disclaimer & Features
                </button>
              </div>
            </div>
          ) : (
            activeTab === 'notes' ? <ManualNotes fontSize={fontSize} isBW={isBW} fontColor={fontColor} /> : <LiveAssistant fontSize={fontSize} isBW={isBW} fontColor={fontColor} />
          )}

          {/* Welcome & Disclaimer Overlay Modal */}
          {showWelcome && (
            <div className={`absolute inset-0 z-30 flex flex-col p-6 items-center justify-between overflow-y-auto ${isBW ? 'bg-black text-white border border-white/20' : 'bg-slate-900/98 text-slate-200 border border-slate-700/50'} rounded-2xl`}>
              <div className="w-full flex-1 flex flex-col space-y-4 max-w-md my-auto justify-center">
                <div className="flex flex-col items-center text-center space-y-2 mb-2">
                  <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                    <MessageSquare className="w-8 h-8 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Welcome to Presenter Overlay</h2>
                  <p className={`text-xs ${isBW ? 'text-gray-400' : 'text-slate-400'}`}>
                    The invisible teleprompter and real-time AI presentation assistant.
                  </p>
                </div>

                <div className="space-y-3 text-left">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Core Features</h3>
                  <ul className="space-y-2.5 text-xs">
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <div>
                        <strong className="text-white">Zero-Leak Screen Hiding</strong>
                        <p className={isBW ? 'text-gray-400' : 'text-slate-400'}>Window automatically hides from screen sharing (Zoom, Loom, Meet, Teams).</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <div>
                        <strong className="text-white">Live AI Demo Co-Pilot</strong>
                        <p className={isBW ? 'text-gray-400' : 'text-slate-400'}>Listens to your speech to build context and instantly answers audience Q&A.</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <div>
                        <strong className="text-white">Auto-Saving Teleprompter</strong>
                        <p className={isBW ? 'text-gray-400' : 'text-slate-400'}>Keeps cues and bullet points directly in your line of sight with automatic recovery.</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className={`p-4 rounded-xl border text-left ${isBW ? 'bg-white/5 border-white/20' : 'bg-red-500/5 border-red-500/20'} space-y-2`}>
                  <div className="flex items-center space-x-2 text-amber-400">
                    <span className="font-bold text-sm">⚠</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Ethical Use Disclaimer</h4>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isBW ? 'text-gray-300' : 'text-slate-300'}`}>
                    This application is designed strictly to support public speakers, teachers, and developers presenting live demos. It is <strong>NOT</strong> intended to bypass academic integrity, certification testing, or job interview protocols. <strong>Warning:</strong> Automated proctoring applications will detect this background process and overlay window tree (meaning they will find out). Do not attempt to use this tool on proctored examination or interview sites.
                  </p>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem('presenter-overlay-welcome-accepted', 'true');
                    setShowWelcome(false);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold text-sm transition-all shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
                >
                  I Understand & Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
