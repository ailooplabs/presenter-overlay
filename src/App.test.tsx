import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import App from './App';

// Mock the Gemini API SDK
vi.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = class {
    apiKey: string;
    constructor(apiKey: string) {
      this.apiKey = apiKey;
    }
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'Mocked Gemini response answer for E2E testing',
          },
        }),
      };
    }
  };
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  };
});

beforeAll(() => {
  // Mock localStorage
  let store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
  Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

  // Mock SpeechRecognition and webkitSpeechRecognition
  const MockSpeechRecognition = vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  global.SpeechRecognition = MockSpeechRecognition;
  global.webkitSpeechRecognition = MockSpeechRecognition;

  // Mock MediaRecorder as a class constructor
  class MockMediaRecorder {
    static isTypeSupported = vi.fn().mockReturnValue(true);
    start = vi.fn().mockImplementation(() => {
      this.state = 'recording';
    });
    stop = vi.fn().mockImplementation(() => {
      this.state = 'inactive';
      if (this.onstop) {
        // Mock sending data available
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob([new Uint8Array(1000)], { type: 'audio/mp4' }) } as any);
        }
        this.onstop();
      }
    });
    ondataavailable: any = null;
    onstop: any = null;
    state = 'inactive';
  }
  global.MediaRecorder = MockMediaRecorder as any;

  // Mock MediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
  });
});

beforeEach(() => {
  // Initialize mock IPC before each test
  mockIPC((cmd) => {
    return Promise.resolve();
  });
  // Stub environment variable by default so tests run under clean state
  vi.stubEnv('VITE_GEMINI_API_KEY', '');
  localStorage.setItem('presenter-overlay-welcome-accepted', 'true');
});

afterEach(() => {
  clearMocks();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Presenter Overlay App Functional/E2E tests', () => {
  test('App renders correctly and default elements exist', () => {
    render(<App />);
    expect(screen.getByText('PRESENTER OVERLAY')).toBeInTheDocument();
    expect(screen.getByText('Manual Notes')).toBeInTheDocument();
    expect(screen.getByText('Live Demo AI')).toBeInTheDocument();
  });

  test('IPC commands are invoked correctly on mount and user interaction', async () => {
    const invokedCommands: string[] = [];
    mockIPC((cmd) => {
      invokedCommands.push(cmd);
      return Promise.resolve();
    });

    const { container } = render(<App />);

    // Check set_window_hidden_from_capture invoked on mount
    await waitFor(() => {
      expect(invokedCommands).toContain('set_window_hidden_from_capture');
    });

    // Test start_dragging invocation on titlebar mouse down
    const titleBar = screen.getByText('PRESENTER OVERLAY').parentElement;
    expect(titleBar).toBeInTheDocument();
    fireEvent.mouseDown(titleBar!);
    expect(invokedCommands).toContain('start_dragging');

    // Test close_window invocation on close button click
    const closeBtn = container.querySelector('.lucide-x')?.parentElement;
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn!);
    expect(invokedCommands).toContain('close_window');
  });

  test('Settings toggles and value updates function properly', () => {
    const { container } = render(<App />);
    
    // Toggle settings panel via SVG class
    const settingsIcon = container.querySelector('.lucide-settings');
    expect(settingsIcon).toBeInTheDocument();
    fireEvent.click(settingsIcon!.parentElement!);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Test font size increment/decrement using element siblings of the span containing "16"
    const fontSpan = screen.getByText('16');
    const sizeMinusBtn = fontSpan.previousElementSibling;
    const sizePlusBtn = fontSpan.nextElementSibling;
    
    expect(sizeMinusBtn).toBeInTheDocument();
    expect(sizePlusBtn).toBeInTheDocument();

    fireEvent.click(sizePlusBtn!);
    expect(screen.getByText('18')).toBeInTheDocument();
    fireEvent.click(sizeMinusBtn!);
    expect(screen.getByText('16')).toBeInTheDocument();

    // Toggle high contrast theme
    const themeBtn = screen.getByText('High Contrast (B/W) OFF');
    fireEvent.click(themeBtn);
    expect(screen.getByText('High Contrast (B/W) ON')).toBeInTheDocument();
  });

  test('Font color white (#ffffff) fallback works correctly', () => {
    const { container } = render(<App />);
    
    // Toggle settings
    const settingsIcon = container.querySelector('.lucide-settings');
    fireEvent.click(settingsIcon!.parentElement!);
    
    // Select White color button (#ffffff is first color in list)
    const whiteColorButton = screen.getByTitle('#ffffff');
    fireEvent.click(whiteColorButton);
    
    // Close settings via the settings panel close button (next element sibling to Settings header)
    const closeSettingsBtn = screen.getByText('Settings').nextElementSibling;
    expect(closeSettingsBtn).toBeInTheDocument();
    fireEvent.click(closeSettingsBtn!);
    
    // Check that the fontColor fallback yields undefined inline color (falls back to class)
    const containerDiv = container.querySelector('.shadow-2xl');
    expect(containerDiv).toBeInTheDocument();
    const style = (containerDiv as HTMLElement).style.color;
    expect(style).toBe('');
  });

  test('Manual Notes handles editing and auto-save', async () => {
    vi.useFakeTimers();
    render(<App />);
    
    const textarea = screen.getByPlaceholderText(/Type your presentation notes here/i);
    expect(textarea).toBeInTheDocument();
    
    // Enter note content
    fireEvent.change(textarea, { target: { value: 'Hello manual notes' } });
    
    // Check that it is not saved immediately (debounce 500ms)
    expect(localStorage.getItem('presenter-notes')).toBeNull();
    
    // Advance timers
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    expect(localStorage.getItem('presenter-notes')).toBe('Hello manual notes');
    vi.useRealTimers();
  });

  test('Live Assistant AI handles API key configurations, questions, and replies', async () => {
    const { container } = render(<App />);
    
    // Navigate to Live Assistant tab
    const aiTabBtn = screen.getByText('Live Demo AI');
    fireEvent.click(aiTabBtn);

    // Prompt for API key should be active (if localStorage empty and no env variable)
    expect(screen.getByText('Gemini API Key')).toBeInTheDocument();
    
    // Input simulated API Key
    const keyInput = screen.getByPlaceholderText('AIzaSy...');
    fireEvent.change(keyInput, { target: { value: 'AIzaSyTestKey' } });
    
    const saveBtn = screen.getByText('Save Key');
    fireEvent.click(saveBtn);
    
    // Should now show Live Transcript Context
    expect(screen.getByText('Live Transcript Context')).toBeInTheDocument();
    expect(localStorage.getItem('gemini-api-key')).toBe('AIzaSyTestKey');

    // Enter a question and submit it
    const questionInput = screen.getByPlaceholderText('Audience question...');
    fireEvent.change(questionInput, { target: { value: 'How does this work?' } });
    
    const submitBtn = container.querySelector('.lucide-send')?.parentElement;
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn!);

    // Log errors if query failed
    await waitFor(() => {
      const errorEl = container.querySelector('.text-red-400');
      if (errorEl) {
        console.error('UI Error text:', errorEl.textContent);
      }
      expect(screen.getByText('Mocked Gemini response answer for E2E testing')).toBeInTheDocument();
    });
  });

  test('Welcome & Disclaimer modal appears and can be accepted', async () => {
    localStorage.removeItem('presenter-overlay-welcome-accepted');
    render(<App />);
    
    // Check that the Welcome Screen renders
    expect(screen.getByText('Welcome to Presenter Overlay')).toBeInTheDocument();
    expect(screen.getByText(/Ethical Use Disclaimer/i)).toBeInTheDocument();
    
    // Click the understand & continue button
    const acceptBtn = screen.getByText('I Understand & Continue');
    fireEvent.click(acceptBtn);
    
    // Check that it's accepted and saved to local storage
    expect(localStorage.getItem('presenter-overlay-welcome-accepted')).toBe('true');
    expect(screen.queryByText('Welcome to Presenter Overlay')).not.toBeInTheDocument();
  });

  test('Audience question can be recorded via mic and transcribed', async () => {
    const { container } = render(<App />);
    
    // Navigate to Live Assistant tab
    const aiTabBtn = screen.getByText('Live Demo AI');
    fireEvent.click(aiTabBtn);
    
    // Save API key
    const keyInput = screen.getByPlaceholderText('AIzaSy...');
    fireEvent.change(keyInput, { target: { value: 'AIzaSyTestKey' } });
    const saveBtn = screen.getByText('Save Key');
    fireEvent.click(saveBtn);
    
    // Find the record question mic button
    const recordBtn = screen.getByTitle('Record question via mic');
    expect(recordBtn).toBeInTheDocument();
    
    // Click to start recording
    await act(async () => {
      fireEvent.click(recordBtn);
      // Allow getUserMedia promise to resolve
      await new Promise((r) => setTimeout(r, 10));
    });
    
    expect(recordBtn.title).toBe('Stop recording question');
    
    // Click to stop recording and trigger transcription
    await act(async () => {
      fireEvent.click(recordBtn);
      // Allow MediaRecorder.stop and transcribe promise to resolve
      await new Promise((r) => setTimeout(r, 10));
    });
    
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText('Audience question...');
      expect((textarea as HTMLTextAreaElement).value).toContain('Mocked Gemini response');
    });
  });
});
