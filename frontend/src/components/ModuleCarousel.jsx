import React, { useRef } from 'react';
import {
  Upload, MessageSquare, Clock, Settings, Database,
  BrainCircuit, Shield, Zap, FileSearch, ChevronLeft, ChevronRight, ArrowRight
} from 'lucide-react';

const MODULES = [
  {
    id: 'upload',
    tab: 'home',
    icon: Upload,
    label: 'Upload Documents',
    desc: 'Drag & drop PDF or PPT/PPTX files to index them instantly.',
    color: '#00c8c8',
    glow: 'rgba(0,200,200,0.3)',
    gradient: 'linear-gradient(135deg, rgba(0,200,200,0.18) 0%, rgba(0,100,130,0.10) 100%)',
    border: 'rgba(0,200,200,0.28)',
    tag: 'Core',
  },
  {
    id: 'chat',
    tab: 'chat',
    icon: MessageSquare,
    label: 'Chat Q&A',
    desc: 'Ask natural language questions. Get grounded, sourced answers.',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.3)',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(80,30,160,0.10) 100%)',
    border: 'rgba(139,92,246,0.28)',
    tag: 'AI',
  },
  {
    id: 'history',
    tab: 'history',
    icon: Clock,
    label: 'Session History',
    desc: 'Review and resume all past conversation sessions and indexed files.',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.3)',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.16) 0%, rgba(0,90,120,0.10) 100%)',
    border: 'rgba(6,182,212,0.25)',
    tag: 'History',
  },
  {
    id: 'faiss',
    tab: 'home',
    icon: Database,
    label: 'FAISS Vector Store',
    desc: 'Local FAISS indices built from sentence-transformer embeddings for fast retrieval.',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.3)',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(120,60,0,0.10) 100%)',
    border: 'rgba(245,158,11,0.25)',
    tag: 'Storage',
  },
  {
    id: 'llm',
    tab: 'chat',
    icon: BrainCircuit,
    label: 'LLM Integration',
    desc: 'Supports Groq (Llama 3), OpenAI GPT-4, and Gemini Pro models.',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.3)',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(0,80,50,0.10) 100%)',
    border: 'rgba(16,185,129,0.25)',
    tag: 'Models',
  },
  {
    id: 'guardrails',
    tab: 'chat',
    icon: Shield,
    label: 'Anti-Hallucination',
    desc: 'Confidence thresholds & relevance guardrails prevent out-of-context answers.',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.3)',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(100,0,0,0.10) 100%)',
    border: 'rgba(239,68,68,0.25)',
    tag: 'Safety',
  },
  {
    id: 'search',
    tab: 'chat',
    icon: FileSearch,
    label: 'Semantic Search',
    desc: 'Dense vector retrieval with chunk overlap for maximum contextual accuracy.',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.3)',
    gradient: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(70,30,130,0.10) 100%)',
    border: 'rgba(167,139,250,0.25)',
    tag: 'Search',
  },
  {
    id: 'settings',
    tab: null,
    icon: Settings,
    label: 'Settings & Keys',
    desc: 'Manage LLM provider, API keys, system prompt, and response threshold.',
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.3)',
    gradient: 'linear-gradient(135deg, rgba(251,191,36,0.14) 0%, rgba(100,70,0,0.10) 100%)',
    border: 'rgba(251,191,36,0.25)',
    tag: 'Config',
  },
];

export default function ModuleCarousel({ setActiveTab, onOpenSettings }) {
  const scrollRef = useRef(null);

  /* Convert vertical wheel scroll → horizontal scroll */
  const onWheel = (e) => {
    if (!scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft += e.deltaY * 1.2;
  };

  const scrollBy = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  const handleClick = (mod) => {
    if (mod.id === 'settings') {
      onOpenSettings?.();
    } else if (mod.tab) {
      setActiveTab(mod.tab);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Left arrow */}
      <button
        onClick={() => scrollBy(-1)}
        style={{
          position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)',
          zIndex: 10, width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(3,13,18,0.92)',
          border: '1px solid rgba(0,200,200,0.2)',
          boxShadow: '0 2px 12px rgba(0,200,200,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'rgba(94,234,212,0.8)',
        }}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        onWheel={onWheel}
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 8,
          paddingTop: 4,
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',          /* Firefox */
          msOverflowStyle: 'none',         /* IE */
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              onClick={() => handleClick(mod)}
              style={{
                flexShrink: 0,
                width: 220,
                scrollSnapAlign: 'start',
                borderRadius: 16,
                padding: '20px 18px',
                background: mod.gradient,
                border: `1px solid ${mod.border}`,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 32px ${mod.glow}`;
                e.currentTarget.style.borderColor = mod.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = mod.border;
              }}
            >
              {/* Background glow blob */}
              <div style={{
                position: 'absolute', right: -20, bottom: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: mod.glow, filter: 'blur(30px)',
                pointerEvents: 'none',
              }} />

              {/* Tag */}
              <span style={{
                position: 'absolute', top: 12, right: 12,
                fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: 99,
                background: `${mod.color}18`,
                border: `1px solid ${mod.color}40`,
                color: mod.color,
              }}>
                {mod.tag}
              </span>

              {/* Icon */}
              <div style={{
                width: 42, height: 42, borderRadius: 12, marginBottom: 14,
                background: `${mod.color}18`,
                border: `1px solid ${mod.color}35`,
                boxShadow: `0 4px 16px ${mod.glow}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={mod.color} />
              </div>

              {/* Text */}
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: '#e0f0f0', marginBottom: 6,
                fontFamily: 'Outfit, Inter, sans-serif',
              }}>
                {mod.label}
              </div>
              <div style={{
                fontSize: 11, lineHeight: 1.5,
                color: 'rgba(150,200,200,0.7)',
              }}>
                {mod.desc}
              </div>

              {/* Bottom arrow */}
              <div style={{
                marginTop: 14, display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 600, color: mod.color,
              }}>
                <ArrowRight size={11} />
                <span>{mod.id === 'settings' ? 'Open Settings' : mod.tab === 'home' ? 'Go to Dashboard' : `Open ${mod.label.split(' ')[0]}`}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scrollBy(1)}
        style={{
          position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)',
          zIndex: 10, width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(3,13,18,0.92)',
          border: '1px solid rgba(0,200,200,0.2)',
          boxShadow: '0 2px 12px rgba(0,200,200,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'rgba(94,234,212,0.8)',
        }}
      >
        <ChevronRight size={14} />
      </button>

      {/* Hide scrollbar for WebKit */}
      <style>{`
        div[data-module-scroll]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
