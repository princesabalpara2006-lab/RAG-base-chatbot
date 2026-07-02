import React, { useState, useEffect } from 'react';
import { Settings, X, Save } from 'lucide-react';
import { getSettings, updateSettings } from '../services/api';

export default function SettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    threshold: 0.3,
    system_prompt: '',
    api_keys: { openai: '', gemini: '', groq: '' }
  });
  const [apiKeysStatus, setApiKeysStatus] = useState({});
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      getSettings()
        .then((res) => {
          setSettings({
            provider: res.data.provider,
            model: res.data.model,
            threshold: res.data.threshold,
            system_prompt: res.data.system_prompt,
            api_keys: {
              openai: res.data.masked_api_keys?.openai || '',
              gemini: res.data.masked_api_keys?.gemini || '',
              groq: res.data.masked_api_keys?.groq || '',
            }
          });
          setApiKeysStatus(res.data.api_keys_status || {});
        })
        .catch(err => console.error("Error getting settings: ", err));
    }
  }, [isOpen]);

  const handleSaveSettings = async () => {
    setSaveStatus('Saving...');
    try {
      const keyUpdates = {};
      for (const [provider, key] of Object.entries(settings.api_keys)) {
        if (key && !key.startsWith('****')) {
          keyUpdates[provider] = key;
        }
      }

      await updateSettings({
        provider: settings.provider,
        model: settings.model,
        threshold: parseFloat(settings.threshold),
        system_prompt: settings.system_prompt,
        api_keys: keyUpdates
      });

      setSaveStatus('Saved successfully!');
      setTimeout(() => {
        setSaveStatus('');
        onClose();
        window.dispatchEvent(new Event('settings-updated'));
      }, 1000);
    } catch (err) {
      console.error("Error saving settings: ", err);
      setSaveStatus('Error saving settings.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/5 bg-slate-955/75 backdrop-blur-xl p-6 shadow-2xl overflow-hidden">
        {/* Background design glow */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-405" />
            <h3 className="text-md font-bold text-white">Global RAG Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-left overflow-y-auto max-h-[450px] pr-2">
          {/* LLM Provider */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              AI Model Provider
            </label>
            <select
              value={settings.provider}
              onChange={(e) => {
                const prov = e.target.value;
                const defModel = prov === 'groq' ? 'llama-3.3-70b-versatile' : (prov === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');
                setSettings({ ...settings, provider: prov, model: defModel });
              }}
              className="w-full mt-1.5 rounded-lg border border-white/5 bg-slate-955 px-3 py-2 text-xs text-slate-250 outline-none focus:border-cyan-500"
            >
              <option value="groq">Groq Console (Local Embeddings)</option>
              <option value="openai">OpenAI (GPT Models)</option>
              <option value="gemini">Google Gemini (OpenAI Endpoint)</option>
            </select>
          </div>

          {/* Model Select */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Model Version
            </label>
            {settings.provider === 'groq' ? (
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="w-full mt-1.5 rounded-lg border border-white/5 bg-slate-955 px-3 py-2 text-xs text-slate-250 outline-none focus:border-cyan-500"
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Smart)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fast)</option>
              </select>
            ) : settings.provider === 'openai' ? (
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="w-full mt-1.5 rounded-lg border border-white/5 bg-slate-955 px-3 py-2 text-xs text-slate-250 outline-none focus:border-cyan-500"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Cost-effective)</option>
                <option value="gpt-4o">gpt-4o (Premium)</option>
              </select>
            ) : (
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="w-full mt-1.5 rounded-lg border border-white/5 bg-slate-955 px-3 py-2 text-xs text-slate-250 outline-none focus:border-cyan-500"
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Rich context)</option>
              </select>
            )}
          </div>

          {/* RAG Confidence Score */}
          <div>
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                RAG Confidence Threshold
              </label>
              <span className="text-xs font-semibold text-cyan-405">{settings.threshold}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Filters responses if cosine similarity falls below this score. Higher values prevent hallucination.
            </p>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={settings.threshold}
              onChange={(e) => setSettings({ ...settings, threshold: parseFloat(e.target.value) })}
              className="w-full mt-2 accent-cyan-500 h-1 bg-slate-955 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* API Keys Configuration */}
          <div className="space-y-2 border-t border-white/5 pt-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Custom Provider API Keys
            </label>
            <div className="space-y-2">
              {/* GROQ Key */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold w-16 text-slate-550 uppercase">Groq</span>
                <input
                  type="password"
                  placeholder={apiKeysStatus.groq ? "Key configured (Saved)" : "Enter Groq API Key..."}
                  value={settings.api_keys.groq}
                  onChange={(e) => setSettings({
                    ...settings,
                    api_keys: { ...settings.api_keys, groq: e.target.value }
                  })}
                  className="flex-1 rounded-lg border border-white/5 bg-slate-955 px-3 py-1.5 text-xs text-slate-250 outline-none focus:border-cyan-500"
                />
              </div>
              {/* OpenAI Key */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold w-16 text-slate-550 uppercase">OpenAI</span>
                <input
                  type="password"
                  placeholder={apiKeysStatus.openai ? "Key configured (Saved)" : "Enter OpenAI API Key..."}
                  value={settings.api_keys.openai}
                  onChange={(e) => setSettings({
                    ...settings,
                    api_keys: { ...settings.api_keys, openai: e.target.value }
                  })}
                  className="flex-1 rounded-lg border border-white/5 bg-slate-955 px-3 py-1.5 text-xs text-slate-250 outline-none focus:border-cyan-500"
                />
              </div>
              {/* Gemini Key */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold w-16 text-slate-550 uppercase">Gemini</span>
                <input
                  type="password"
                  placeholder={apiKeysStatus.gemini ? "Key configured (Saved)" : "Enter Gemini API Key..."}
                  value={settings.api_keys.gemini}
                  onChange={(e) => setSettings({
                    ...settings,
                    api_keys: { ...settings.api_keys, gemini: e.target.value }
                  })}
                  className="flex-1 rounded-lg border border-white/5 bg-slate-955 px-3 py-1.5 text-xs text-slate-250 outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Custom System Prompt */}
          <div className="border-t border-white/5 pt-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              System Prompt Template
            </label>
            <textarea
              rows={4}
              value={settings.system_prompt}
              onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
              placeholder="Configure system prompts instructions..."
              className="w-full mt-1.5 rounded-lg border border-white/5 bg-slate-955 px-3 py-2 text-xs text-slate-250 outline-none focus:border-cyan-500 resize-none font-mono"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
          <span className={`text-xs font-semibold ${saveStatus.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {saveStatus}
          </span>
          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/10 transition-all active:scale-95"
          >
            <Save className="h-3.5 w-3.5" />
            Save configurations
          </button>
        </div>
      </div>
    </div>
  );
}
