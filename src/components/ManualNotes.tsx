import { useState, useEffect } from 'react';

const ManualNotes = ({ fontSize, isBW, fontColor }: { fontSize: number, isBW: boolean, fontColor: string }) => {
  const [notes, setNotes] = useState('');

  // Load from local storage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('presenter-notes');
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, []);

  // Auto-save to local storage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('presenter-notes', notes);
    }, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [notes]);

  return (
    <div className="h-full flex flex-col space-y-3">
      <div className="flex justify-between items-center px-1">
        <h2 className={`font-semibold ${isBW ? 'text-white' : 'text-slate-300'}`} style={{ fontSize: `${Math.max(12, fontSize - 2)}px` }}>Your Private Notes</h2>
        <span className={`text-xs ${isBW ? 'text-gray-400' : 'text-slate-500'}`}>Auto-saved</span>
      </div>
      <textarea
        className={`flex-1 w-full p-4 rounded-xl border focus:outline-none resize-none bg-transparent ${isBW ? 'border-white/30 placeholder-gray-500 focus:ring-1 focus:ring-white' : 'border-slate-700/50 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50'}`}
        style={{ fontSize: `${fontSize}px`, color: fontColor !== '#ffffff' ? fontColor : undefined }}
        placeholder="Type your presentation notes here... They will remain hidden from your audience."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </div>
  );
};

export default ManualNotes;
