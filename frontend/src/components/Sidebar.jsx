import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Settings, Pin, Trash2, Edit2, ChevronLeft, ChevronRight, 
  MessageSquare, MoreVertical, X, Check, Save, Database, ShieldAlert, Cpu
} from 'lucide-react';
import { 
  getConversations, renameConversation, deleteConversation, 
  getSettings, updateSettings 
} from '../services/api';

export default function Sidebar({ 
  onSelectConversation, 
  activeConversationId, 
  onCreateNewChat,
  isOpen, 
  setIsOpen 
}) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedChats, setPinnedChats] = useState([]); // Save pinned chat IDs in local storage
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    threshold: 0.3,
    system_prompt: '',
    api_keys: { openai: '', gemini: '', groq: '' }
  });
  const [maskedKeys, setMaskedKeys] = useState({});
  const [apiKeysStatus, setApiKeysStatus] = useState({});
  const [saveStatus, setSaveStatus] = useState('');

  // Load history & settings
  const fetchHistory = async () => {
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch (err) {
      console.error("Error fetching conversations: ", err);
    }
  };

  useEffect(() => {
    fetchHistory();
    // Load pinned chats from localStorage
    const savedPins = localStorage.getItem('pinned_conversations');
    if (savedPins) {
      setPinnedChats(JSON.parse(savedPins));
    }
  }, [activeConversationId]);

  // Load initial settings
  useEffect(() => {
    if (showSettings) {
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
          setMaskedKeys(res.data.masked_api_keys || {});
        })
        .catch(err => console.error("Error getting settings: ", err));
    }
  }, [showSettings]);

  const handleTogglePin = (convId, e) => {
    e.stopPropagation();
    let updated;
    if (pinnedChats.includes(convId)) {
      updated = pinnedChats.filter(id => id !== convId);
    } else {
      updated = [...pinnedChats, convId];
    }
    setPinnedChats(updated);
    localStorage.setItem('pinned_conversations', JSON.stringify(updated));
    setActiveMenuId(null);
  };

  const handleStartRename = (convId, currentTitle, e) => {
    e.stopPropagation();
    setEditingChatId(convId);
    setEditTitle(currentTitle);
    setActiveMenuId(null);
  };

  const handleSaveRename = async (convId, e) => {
    if (e) e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await renameConversation(convId, editTitle.trim());
      setEditingChatId(null);
      fetchHistory();
    } catch (err) {
      console.error("Error renaming conversation: ", err);
    }
  };

  const handleDelete = async (convId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat history?")) return;
    try {
      await deleteConversation(convId);
      if (activeConversationId === convId) {
        onCreateNewChat();
      }
      fetchHistory();
      setActiveMenuId(null);
    } catch (err) {
      console.error("Error deleting conversation: ", err);
    }
  };

  const handleSaveSettings = async () => {
    setSaveStatus('Saving...');
    try {
      // Strip out placeholder values like ******* from API Keys
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
        setShowSettings(false);
        // Dispatch custom event to trigger backend re-fetch of parameters if needed
        window.dispatchEvent(new Event('settings-updated'));
      }, 1000);
    } catch (err) {
      console.error("Error saving settings: ", err);
      setSaveStatus('Error saving settings. Try again.');
    }
  };

  // Group conversations by date
  const getGroupedConversations = () => {
    const filtered = conversations.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinned = filtered.filter(c => pinnedChats.includes(c.conversation_id));
    const unpinned = filtered.filter(c => !pinnedChats.includes(c.conversation_id));

    const groups = {
      pinned: pinned,
      today: [],
      yesterday: [],
      previous: []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    unpinned.forEach(c => {
      const cDate = new Date(c.timestamp);
      cDate.setHours(0, 0, 0, 0);
      
      if (cDate.getTime() === today.getTime()) {
        groups.today.push(c);
      } else if (cDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(c);
      } else {
        groups.previous.push(c);
      }
    });

    return groups;
  };

  const grouped = getGroupedConversations();

  return (
    <>
      {/* Mobile sidebar toggle floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-4 top-20 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white shadow-lg transition-transform md:translate-x-0"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Main Sidebar Panel */}
      <div 
        className={`fixed top-16 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-slate-850 bg-slate-950/90 backdrop-blur-md transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute -right-3 top-4 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-slate-400 hover:text-white md:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Action Header */}
        <div className="p-4 flex gap-2">
          <button
            onClick={onCreateNewChat}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-550 hover:to-brand-450 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/10 transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="px-4 mb-2">
          <div className="relative flex items-center rounded-lg border border-slate-850 bg-slate-900/30 px-3 py-1.5 focus-within:border-brand-500 transition-colors">
            <Search className="h-3.5 w-3.5 text-slate-500 mr-2" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="h-3 w-3 text-slate-500 hover:text-slate-350" />
              </button>
            )}
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2 scrollbar-thin">
          {/* PINNED SECTION */}
          {grouped.pinned.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Pin className="h-3 w-3 text-brand-400 rotate-45" />
                Pinned
              </div>
              {grouped.pinned.map(c => renderChatRow(c))}
            </div>
          )}

          {/* TODAY SECTION */}
          {grouped.today.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Today</div>
              {grouped.today.map(c => renderChatRow(c))}
            </div>
          )}

          {/* YESTERDAY SECTION */}
          {grouped.yesterday.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Yesterday</div>
              {grouped.yesterday.map(c => renderChatRow(c))}
            </div>
          )}

          {/* PREVIOUS SECTION */}
          {grouped.previous.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Previous Chats</div>
              {grouped.previous.map(c => renderChatRow(c))}
            </div>
          )}

          {conversations.length === 0 && (
            <div className="text-center text-xs text-slate-600 py-8">
              No conversations yet
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-900 bg-slate-950/60 p-4">
          <button
            onClick={() => setShowSettings(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-850 hover:border-slate-750 bg-slate-900/10 hover:bg-slate-900/30 px-3 py-2.5 text-xs text-slate-350 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" />
              <span>Model & API Settings</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-650" />
          </button>
        </div>
      </div>

      {/* Settings Modal Dialog */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl overflow-hidden">
            {/* Background design glow */}
            <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-brand-400" />
                <h3 className="text-md font-bold text-white">Global RAG Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
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
                  className="w-full mt-1.5 rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500"
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
                    className="w-full mt-1.5 rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500"
                  >
                    <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Smart)</option>
                    <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fast)</option>
                  </select>
                ) : settings.provider === 'openai' ? (
                  <select
                    value={settings.model}
                    onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                    className="w-full mt-1.5 rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Cost-effective)</option>
                    <option value="gpt-4o">gpt-4o (Premium)</option>
                  </select>
                ) : (
                  <select
                    value={settings.model}
                    onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                    className="w-full mt-1.5 rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500"
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
                  <span className="text-xs font-semibold text-brand-400">{settings.threshold}</span>
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
                  className="w-full mt-2 accent-brand-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* API Keys Configuration */}
              <div className="space-y-2 border-t border-slate-850 pt-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Custom Provider API Keys
                </label>
                <div className="space-y-2">
                  {/* GROQ Key */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold w-16 text-slate-500 uppercase">Groq</span>
                    <input
                      type="password"
                      placeholder={apiKeysStatus.groq ? "Key configured (Saved)" : "Enter Groq API Key..."}
                      value={settings.api_keys.groq}
                      onChange={(e) => setSettings({
                        ...settings,
                        api_keys: { ...settings.api_keys, groq: e.target.value }
                      })}
                      className="flex-1 rounded-lg border border-slate-850 bg-slate-950 px-3 py-1.5 text-xs text-slate-350 outline-none focus:border-brand-500"
                    />
                  </div>
                  {/* OpenAI Key */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold w-16 text-slate-500 uppercase">OpenAI</span>
                    <input
                      type="password"
                      placeholder={apiKeysStatus.openai ? "Key configured (Saved)" : "Enter OpenAI API Key..."}
                      value={settings.api_keys.openai}
                      onChange={(e) => setSettings({
                        ...settings,
                        api_keys: { ...settings.api_keys, openai: e.target.value }
                      })}
                      className="flex-1 rounded-lg border border-slate-850 bg-slate-950 px-3 py-1.5 text-xs text-slate-350 outline-none focus:border-brand-500"
                    />
                  </div>
                  {/* Gemini Key */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold w-16 text-slate-500 uppercase">Gemini</span>
                    <input
                      type="password"
                      placeholder={apiKeysStatus.gemini ? "Key configured (Saved)" : "Enter Gemini API Key..."}
                      value={settings.api_keys.gemini}
                      onChange={(e) => setSettings({
                        ...settings,
                        api_keys: { ...settings.api_keys, gemini: e.target.value }
                      })}
                      className="flex-1 rounded-lg border border-slate-850 bg-slate-950 px-3 py-1.5 text-xs text-slate-350 outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Custom System Prompt */}
              <div className="border-t border-slate-850 pt-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  System Prompt Template
                </label>
                <textarea
                  rows={4}
                  value={settings.system_prompt}
                  onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                  placeholder="Configure system prompts instructions..."
                  className="w-full mt-1.5 rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none focus:border-brand-500 resize-none font-mono"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <span className={`text-xs font-semibold ${saveStatus.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                {saveStatus}
              </span>
              <button
                onClick={handleSaveSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-650 hover:bg-brand-550 px-4 py-2 text-xs font-semibold text-white shadow transition-transform active:scale-95"
              >
                <Save className="h-3.5 w-3.5" />
                Save configurations
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Sub-renderer for a single chat row
  function renderChatRow(conv) {
    const isSelected = activeConversationId === conv.conversation_id;
    const isEditing = editingChatId === conv.conversation_id;
    const isPinned = pinnedChats.includes(conv.conversation_id);

    return (
      <div
        key={conv.conversation_id}
        onClick={() => !isEditing && onSelectConversation(conv.conversation_id)}
        className={`group relative flex items-center justify-between rounded-lg px-3 py-2 text-xs cursor-pointer transition-all select-none
          ${isSelected 
            ? 'bg-slate-900 border-l-2 border-brand-500 text-white font-medium' 
            : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-4">
          <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-brand-400' : 'text-slate-500'}`} />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename(conv.conversation_id);
                if (e.key === 'Escape') setEditingChatId(null);
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-slate-950 border border-brand-600 rounded px-1.5 py-0.5 text-xs text-white outline-none"
            />
          ) : (
            <span className="truncate">{conv.title}</span>
          )}
        </div>

        {/* Mini Actions buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleTogglePin(conv.conversation_id, e)}
              className="text-slate-500 hover:text-white"
              title={isPinned ? "Unpin Chat" : "Pin Chat"}
            >
              <Pin className={`h-3 w-3 ${isPinned ? 'text-brand-400 fill-brand-400 rotate-45' : 'rotate-45'}`} />
            </button>
            <button
              onClick={(e) => handleStartRename(conv.conversation_id, conv.title, e)}
              className="text-slate-500 hover:text-white"
              title="Rename Chat"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => handleDelete(conv.conversation_id, e)}
              className="text-slate-500 hover:text-red-400"
              title="Delete Chat"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {isEditing && (
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => handleSaveRename(conv.conversation_id, e)}
              className="text-emerald-400 hover:text-emerald-300"
            >
              <Check className="h-3 w-3" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setEditingChatId(null); }}
              className="text-red-400 hover:text-red-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  }
}
