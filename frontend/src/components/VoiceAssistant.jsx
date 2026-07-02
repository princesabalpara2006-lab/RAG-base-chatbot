import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, Play, Pause, Info, HelpCircle } from 'lucide-react';

export default function VoiceAssistant({ 
  onSpeechInput, 
  lastBotMessage, 
  isGenerating,
  disabled 
}) {
  const [voiceActive, setVoiceActive] = useState(false);
  const [ttsState, setTtsState] = useState('idle'); // idle, speaking, paused
  const [recognitionState, setRecognitionState] = useState('idle'); // idle, listening, processing
  
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);
  const hasSpokenRef = useRef(false);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setRecognitionState('listening');
      };

      rec.onresult = (e) => {
        setRecognitionState('processing');
        const transcript = e.results[0][0].transcript;
        if (transcript.trim()) {
          onSpeechInput(transcript);
        }
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setRecognitionState('idle');
        setVoiceActive(false);
      };

      rec.onend = () => {
        setRecognitionState('idle');
        setVoiceActive(false);
      };

      recognitionRef.current = rec;
    }
  }, [onSpeechInput]);

  // Handle SpeechSynthesis reading the latest AI response
  useEffect(() => {
    // Only speak if we have a valid completed AI message and we're active
    if (voiceActive && lastBotMessage && !isGenerating && !hasSpokenRef.current) {
      speakText(lastBotMessage);
      hasSpokenRef.current = true;
    }

    // Reset speech flag when generating new response
    if (isGenerating) {
      hasSpokenRef.current = false;
      stopSpeaking();
    }
  }, [lastBotMessage, isGenerating, voiceActive]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const startListening = () => {
    if (disabled) return;
    stopSpeaking();
    try {
      if (recognitionRef.current) {
        setVoiceActive(true);
        recognitionRef.current.start();
      } else {
        alert("Speech Recognition not supported in this browser. Please use Chrome/Edge.");
      }
    } catch (err) {
      console.error(err);
      setVoiceActive(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceActive(false);
  };

  const speakText = (text) => {
    if (!synthesisRef.current) return;
    
    // Stop any active speech first
    synthesisRef.current.cancel();

    // Strip out markdown tags and URLs from text to keep TTS clean
    const cleanText = text
      .replace(/[*#_`\->\+\[\]]/g, '')
      .replace(/https?:\/\/[^\s]+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      setTtsState('speaking');
    };

    utterance.onend = () => {
      setTtsState('idle');
      // If voice mode is active, automatically resume listening for user input
      if (voiceActive) {
        setTimeout(startListening, 600);
      }
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      setTtsState('idle');
    };

    // Use default native voice
    synthesisRef.current.speak(utterance);
  };

  const pauseSpeaking = () => {
    if (synthesisRef.current && synthesisRef.current.speaking) {
      synthesisRef.current.pause();
      setTtsState('paused');
    }
  };

  const resumeSpeaking = () => {
    if (synthesisRef.current && synthesisRef.current.paused) {
      synthesisRef.current.resume();
      setTtsState('speaking');
    }
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setTtsState('idle');
    }
  };

  const handleToggleVoiceMode = () => {
    if (voiceActive) {
      stopListening();
      stopSpeaking();
    } else {
      startListening();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-850 bg-slate-900/10 p-4 backdrop-blur-sm flex flex-col gap-3 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4.5 w-4.5 text-brand-400" />
          <h4 className="text-xs font-semibold text-slate-200">Interactive Voice Mode</h4>
        </div>
        <button
          onClick={handleToggleVoiceMode}
          disabled={disabled}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
            ${voiceActive 
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse' 
              : 'bg-slate-950 border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white'}
          `}
          title={voiceActive ? "Disable Voice Mode" : "Enable Voice Mode"}
        >
          {voiceActive ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
        </button>
      </div>

      {/* Voice visualizer and controls */}
      {voiceActive && (
        <div className="flex flex-col gap-3 bg-slate-950/40 rounded-xl p-3 border border-slate-850/50">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${recognitionState === 'listening' ? 'bg-red-500 animate-ping' : 'bg-slate-650'}`}></span>
              {recognitionState === 'listening' ? 'Listening to voice...' : (recognitionState === 'processing' ? 'Processing speech...' : (ttsState === 'speaking' ? 'Assistant is speaking' : 'Idle'))}
            </span>
            {ttsState !== 'idle' && (
              <span className="font-mono text-[10px] text-brand-400">Voice TTS active</span>
            )}
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center justify-center h-8 gap-1 select-none">
            {recognitionState === 'listening' ? (
              // Audio waves when listening
              Array.from({ length: 9 }).map((_, i) => (
                <span 
                  key={i} 
                  className="w-1 rounded-full bg-red-400 animate-wave-height"
                  style={{ 
                    height: '20%', 
                    animation: `pulseHeight 0.6s infinite ease-in-out alternate`, 
                    animationDelay: `${i * 0.08}s` 
                  }}
                ></span>
              ))
            ) : ttsState === 'speaking' ? (
              // Audio waves when speaking
              Array.from({ length: 9 }).map((_, i) => (
                <span 
                  key={i} 
                  className="w-1 rounded-full bg-brand-500"
                  style={{ 
                    height: '20%', 
                    animation: `pulseHeight 0.5s infinite ease-in-out alternate`, 
                    animationDelay: `${i * 0.05}s` 
                  }}
                ></span>
              ))
            ) : (
              // Flat line when silent
              Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="w-1 h-1 rounded-full bg-slate-800"></span>
              ))
            )}
          </div>

          {/* Playback Controls */}
          {ttsState !== 'idle' && (
            <div className="flex items-center justify-center gap-2 border-t border-slate-900 pt-2.5">
              {ttsState === 'speaking' ? (
                <button
                  onClick={pauseSpeaking}
                  className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-850 px-2 py-1 text-[10px] text-slate-350 hover:text-white"
                  title="Pause TTS"
                >
                  <Pause className="h-3 w-3" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={resumeSpeaking}
                  className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-850 px-2 py-1 text-[10px] text-slate-350 hover:text-white"
                  title="Resume TTS"
                >
                  <Play className="h-3 w-3 text-brand-400" />
                  Resume
                </button>
              )}
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-850 px-2 py-1 text-[10px] text-slate-350 hover:text-red-400"
                title="Stop TTS"
              >
                <Square className="h-3 w-3 text-red-500" />
                Stop
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS Styles for the Voice Waveform */}
      <style>{`
        @keyframes pulseHeight {
          0% {
            height: 10%;
          }
          100% {
            height: 80%;
          }
        }
      `}</style>
    </div>
  );
}
