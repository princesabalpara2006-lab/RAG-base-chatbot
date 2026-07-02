import React, { useState } from 'react';
import {
  Home, MessageSquare, Clock, Settings, BrainCircuit,
  Upload, BookOpen, BarChart3, ChevronLeft, ChevronRight,
  Sparkles, Database, Cpu, Shield, Zap
} from 'lucide-react';

const NAV_MODULES = [
  {
    id: 'home',
    label: 'Home',
    sublabel: 'Dashboard',
    Icon: Home,
    color: 'rgba(0,200,200,0.9)',
    glow: 'rgba(0,200,200,0.3)',
  },
  {
    id: 'chat',
    label: 'Chat QA',
    sublabel: 'Ask Questions',
    Icon: MessageSquare,
    color: 'rgba(139,92,246,0.9)',
    glow: 'rgba(139,92,246,0.3)',
  },
  {
    id: 'history',
    label: 'History',
    sublabel: 'Past Sessions',
    Icon: Clock,
    color: 'rgba(6,182,212,0.9)',
    glow: 'rgba(6,182,212,0.3)',
  },
];

const FEATURE_PILLS = [
  { Icon: Upload,   label: 'Upload' },
  { Icon: Database, label: 'FAISS' },
  { Icon: Cpu,      label: 'LLM' },
  { Icon: Shield,   label: 'Safe' },
  { Icon: Zap,      label: 'Fast' },
];

export default function AppSidebar({ activeTab, setActiveTab, onOpenSettings, apiStatus }) {
  const [collapsed, setCollapsed] = useState(false);

  const statusColor = {
    checking: '#f59e0b',
    online:   '#10b981',
    offline:  '#ef4444',
  }[apiStatus] || '#f59e0b';

  const statusLabel = {
    checking: 'Connecting',
    online:   'API Online',
    offline:  'Offline',
  }[apiStatus] || 'Checking';

  return (
    <aside
      style={{
        width: collapsed ? '64px' : '220px',
        minWidth: collapsed ? '64px' : '220px',
        transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1), min-width 0.3s cubic-bezier(0.16,1,0.3,1)',
        background: 'rgba(3,13,18,0.82)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        borderRight: '1px solid rgba(0,200,200,0.10)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 40,
        overflowX: 'hidden',
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(0,200,200,0.08)',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #00c8c8 0%, #06b6d4 50%, #8b5cf6 100%)',
            boxShadow: '0 4px 18px rgba(0,200,200,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <BrainCircuit size={18} color="#fff" />
        </div>

        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: 13, fontWeight: 800, fontFamily: 'Outfit, Inter, sans-serif',
              background: 'linear-gradient(135deg, #fff 30%, #5eead4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', whiteSpace: 'nowrap',
            }}>
              DocuMind RAG
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.10em',
              textTransform: 'uppercase', color: 'rgba(94,234,212,0.65)',
              marginTop: 1, whiteSpace: 'nowrap',
            }}>
              Document QA
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation Modules ── */}
      <nav style={{ flex: 1, padding: collapsed ? '12px 8px' : '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>

        {!collapsed && (
          <div style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(0,200,200,0.4)',
            padding: '6px 8px 2px',
          }}>
            Modules
          </div>
        )}

        {NAV_MODULES.map(({ id, label, sublabel, Icon, color, glow }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              id={`sidebar-tab-${id}`}
              onClick={() => setActiveTab(id)}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '10px 10px',
                borderRadius: 12,
                border: active ? `1px solid ${color.replace('0.9', '0.3')}` : '1px solid transparent',
                background: active
                  ? `linear-gradient(135deg, ${color.replace('0.9', '0.12')}, rgba(0,0,0,0.15))`
                  : 'transparent',
                boxShadow: active ? `0 2px 16px ${glow}` : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = `${color.replace('0.9', '0.07')}`;
                  e.currentTarget.style.borderColor = `${color.replace('0.9', '0.20')}`;
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              {/* Active left bar */}
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: '20%', height: '60%',
                  width: 3, borderRadius: '0 4px 4px 0',
                  background: `linear-gradient(180deg, ${color}, ${color.replace('0.9', '0.4')})`,
                  boxShadow: `0 0 8px ${glow}`,
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: active ? color.replace('0.9', '0.15') : 'rgba(255,255,255,0.04)',
                border: active ? `1px solid ${color.replace('0.9', '0.3')}` : '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} color={active ? color : 'rgba(120,160,160,0.8)'} />
              </div>

              {/* Labels */}
              {!collapsed && (
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    color: active ? color : 'rgba(150,200,200,0.7)',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(100,140,140,0.7)', whiteSpace: 'nowrap' }}>
                    {sublabel}
                  </div>
                </div>
              )}
            </button>
          );
        })}

        {/* ── Divider ── */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,200,200,0.12), transparent)',
          margin: '8px 4px',
        }} />

        {!collapsed && (
          <div style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(0,200,200,0.4)',
            padding: '6px 8px 2px',
          }}>
            Tools
          </div>
        )}

        {/* Settings */}
        <button
          id="sidebar-settings"
          onClick={onOpenSettings}
          title={collapsed ? 'Settings' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '10px 0' : '10px 10px',
            borderRadius: 12, border: '1px solid transparent',
            background: 'transparent', cursor: 'pointer', width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(245,158,11,0.07)';
            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.20)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings size={15} color="rgba(245,158,11,0.8)" />
          </div>
          {!collapsed && (
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(245,158,11,0.8)', whiteSpace: 'nowrap' }}>
                Settings
              </div>
              <div style={{ fontSize: 9, color: 'rgba(100,140,140,0.7)', whiteSpace: 'nowrap' }}>
                LLM & API Config
              </div>
            </div>
          )}
        </button>
      </nav>

      {/* ── Bottom: API Status + Feature pills ── */}
      {!collapsed && (
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid rgba(0,200,200,0.08)',
        }}>
          {/* Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10, color: 'rgba(100,160,160,0.8)',
            marginBottom: 10,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
              flexShrink: 0,
            }} />
            {statusLabel}
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {FEATURE_PILLS.map(({ Icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 7px', borderRadius: 99,
                background: 'rgba(0,200,200,0.06)',
                border: '1px solid rgba(0,200,200,0.14)',
                fontSize: 9, fontWeight: 600,
                color: 'rgba(94,234,212,0.7)',
              }}>
                <Icon size={9} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API status dot in collapsed mode */}
      {collapsed && (
        <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center' }}>
          <span
            title={statusLabel}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: statusColor, boxShadow: `0 0 8px ${statusColor}`,
            }}
          />
        </div>
      )}

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          position: 'absolute', top: '50%', right: -12,
          transform: 'translateY(-50%)',
          width: 24, height: 24, borderRadius: '50%',
          background: 'rgba(3,13,18,0.95)',
          border: '1px solid rgba(0,200,200,0.25)',
          boxShadow: '0 2px 12px rgba(0,200,200,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 50, color: 'rgba(94,234,212,0.8)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(0,200,200,0.15)';
          e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,200,200,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(3,13,18,0.95)';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,200,0.2)';
        }}
      >
        {collapsed
          ? <ChevronRight size={12} />
          : <ChevronLeft size={12} />
        }
      </button>
    </aside>
  );
}
