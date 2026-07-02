import React, { useState, useEffect } from 'react';
import { BrainCircuit, Home, MessageSquare, Clock, Settings } from 'lucide-react';

const NAV_TABS = [
  { id: 'home',    label: 'Home',    Icon: Home },
  { id: 'chat',    label: 'Chat',    Icon: MessageSquare },
  { id: 'history', label: 'History', Icon: Clock },
];

export default function Navbar({ activeTab, setActiveTab, onOpenSettings }) {
  const [scrolled, setScrolled] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking'); // checking | online | offline

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Ping backend health
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(3000) });
        setApiStatus(res.ok ? 'online' : 'offline');
      } catch {
        setApiStatus('offline');
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  const statusColor = {
    checking: 'bg-amber-400',
    online:   'bg-emerald-400',
    offline:  'bg-red-400',
  }[apiStatus];

  const statusLabel = {
    checking: 'Connecting…',
    online:   'API Online',
    offline:  'Offline',
  }[apiStatus];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/[0.07] shadow-xl shadow-black/40'
          : 'border-b border-white/[0.04]'
      }`}
      style={{
        background: 'rgba(5,7,15,0.92)',
        backdropFilter: 'blur(28px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
      }}
    >
      <div className="mx-auto flex h-[62px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ── Brand ── */}
        <div className="flex items-center gap-3 min-w-[180px]">
          {/* Logo mark */}
          <div className="relative flex-shrink-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={{
                background: 'linear-gradient(135deg, #00c8c8 0%, #06b6d4 50%, #8b5cf6 100%)',
                boxShadow: '0 4px 20px rgba(0,200,200,0.50)',
              }}
            >
              <BrainCircuit className="h-5 w-5" />
            </div>
            {/* Live pulse ring */}
            {apiStatus === 'online' && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2"
                style={{ borderColor: 'rgba(5,7,15,0.9)' }}
              />
            )}
          </div>

          <div className="hidden sm:block">
            <h1
              className="text-[15px] font-bold leading-tight"
              style={{
                background: 'linear-gradient(135deg, #fff 30%, #5eead4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              DocuMind RAG
            </h1>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-400/80 leading-none mt-0.5">
              Production-Ready Document QA
            </p>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <nav
          className="flex items-center gap-0.5 p-1 rounded-xl"
          style={{
            background: 'rgba(0,200,200,0.04)',
            border: '1px solid rgba(0,200,200,0.10)',
          }}
        >
          {NAV_TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                id={`nav-tab-${id}`}
                onClick={() => setActiveTab(id)}
                className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                style={
                  active
                    ? {
                        background: 'linear-gradient(135deg, rgba(0,200,200,0.20) 0%, rgba(139,92,246,0.15) 100%)',
                        border: '1px solid rgba(0,200,200,0.35)',
                        color: '#5eead4',
                        boxShadow: '0 2px 12px rgba(0,200,200,0.20)',
                      }
                    : {
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: '#4a7070',
                      }
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #00c8c8, #8b5cf6)' }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-2.5 min-w-[180px] justify-end">

          {/* API Status badge */}
          <div
            className="hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium"
            style={{
              background: 'rgba(0,200,200,0.04)',
              border: '1px solid rgba(0,200,200,0.10)',
              color: '#3a7070',
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${statusColor}`}
              />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor}`} />
            </span>
            {statusLabel}
          </div>

          {/* Settings button */}
          <button
            id="open-settings-btn"
            onClick={onOpenSettings}
            title="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
            style={{
              background: 'rgba(0,200,200,0.04)',
              border: '1px solid rgba(0,200,200,0.10)',
              color: '#3a7070',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,200,200,0.12)';
              e.currentTarget.style.borderColor = 'rgba(0,200,200,0.35)';
              e.currentTarget.style.color = '#5eead4';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0,200,200,0.04)';
              e.currentTarget.style.borderColor = 'rgba(0,200,200,0.10)';
              e.currentTarget.style.color = '#3a7070';
            }}
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* GitHub link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            title="GitHub"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
            style={{
              background: 'rgba(0,200,200,0.04)',
              border: '1px solid rgba(0,200,200,0.10)',
              color: '#3a7070',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,200,200,0.10)';
              e.currentTarget.style.color = '#5eead4';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0,200,200,0.04)';
              e.currentTarget.style.color = '#3a7070';
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
