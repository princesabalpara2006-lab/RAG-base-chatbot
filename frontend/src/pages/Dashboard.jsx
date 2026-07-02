import React, { useState, useEffect } from 'react';
import AppSidebar from '../components/AppSidebar';
import UploadArea from '../components/UploadArea';
import DocumentStatus from '../components/DocumentStatus';
import ChatWindow from '../components/ChatWindow';
import SuggestedQuestions from '../components/SuggestedQuestions';
import SummaryPanel from '../components/SummaryPanel';
import DashboardMetrics from '../components/DashboardMetrics';
import SourcePanel from '../components/SourcePanel';
import VoiceAssistant from '../components/VoiceAssistant';
import SettingsModal from '../components/SettingsModal';
import MatrixBackground from '../components/MatrixBackground';

import {
  Home as HomeIcon,
  MessageSquare,
  Clock,
  Pin,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Sparkles,
  FileText,
  Trash
} from 'lucide-react';

import {
  askQuestionStream,
  getConversationDetails,
  createConversation,
  toggleBookmark,
  sendFeedback,
  getConversations,
  renameConversation,
  deleteConversation,
  getDocuments,
  deleteDocument
} from '../services/api';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home'); // home, chat, history
  const [documentId, setDocumentId] = useState('');
  const [filename, setFilename] = useState('');
  const [questions, setQuestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');

  // Data lists
  const [conversations, setConversations] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Settings & Navigation states
  const [showSettings, setShowSettings] = useState(false);
  const [pinnedChats, setPinnedChats] = useState([]);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Right side Citation drawer
  const [citationOpen, setCitationOpen] = useState(false);
  const [activeCitations, setActiveCitations] = useState([]);
  const [citationConfidence, setCitationConfidence] = useState(0);

  // Fetch all dashboard & history data
  const fetchAllData = async () => {
    try {
      const convRes = await getConversations();
      setConversations(convRes.data);

      const docRes = await getDocuments();
      setDocuments(docRes.data);
    } catch (err) {
      console.error("Error loading RAG data:", err);
    }
  };

  // API health check
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

  useEffect(() => {
    fetchAllData();
    // Load pinned chats from localStorage
    const savedPins = localStorage.getItem('pinned_conversations');
    if (savedPins) {
      setPinnedChats(JSON.parse(savedPins));
    }

    window.addEventListener('settings-updated', fetchAllData);
    window.addEventListener('document-uploaded', fetchAllData);
    window.addEventListener('document-deleted', fetchAllData);
    window.addEventListener('conversation-deleted', fetchAllData);
    window.addEventListener('conversation-created', fetchAllData);
    return () => {
      window.removeEventListener('settings-updated', fetchAllData);
      window.removeEventListener('document-uploaded', fetchAllData);
      window.removeEventListener('document-deleted', fetchAllData);
      window.removeEventListener('conversation-deleted', fetchAllData);
      window.removeEventListener('conversation-created', fetchAllData);
    };
  }, [activeTab]);

  // Auto-switch to chat view when a document is uploaded successfully
  const handleUploadSuccess = (data) => {
    setDocumentId(data.document_id);
    setFilename(data.filename);
    setQuestions(data.questions || []);
    setMessages([]);
    setCitationOpen(false);

    // Auto-create a conversation on backend
    createConversation(data.document_id, `Chat on ${data.filename.substring(0, 20)}...`)
      .then(res => {
        setActiveConversationId(res.data.conversation_id);
        setActiveTab('chat');
        fetchAllData();
      })
      .catch(err => {
        console.error("Error generating new chat session:", err);
        setActiveConversationId(null);
        setActiveTab('chat');
        fetchAllData();
      });
  };

  // Select document from Dashboard list
  const handleSelectDocument = (docId, name) => {
    if (!docId) {
      setDocumentId('');
      setFilename('');
      setQuestions([]);
      setMessages([]);
      setActiveConversationId(null);
      setActiveTab('home');
      return;
    }

    setDocumentId(docId);
    setFilename(name);
    setMessages([]);
    setCitationOpen(false);

    createConversation(docId, `Chat on ${name.substring(0, 20)}...`)
      .then(res => {
        setActiveConversationId(res.data.conversation_id);
        setActiveTab('chat');
        fetchAllData();
      })
      .catch(err => {
        console.error(err);
        setActiveTab('chat');
      });
  };

  // Select historical conversation
  const handleSelectConversation = async (conversationId) => {
    try {
      const res = await getConversationDetails(conversationId);
      const conv = res.data;
      setActiveConversationId(conv.conversation_id);
      setDocumentId(conv.document_id);
      setFilename(conv.title.replace('Chat on ', ''));
      setMessages(conv.messages || []);
      setCitationOpen(false);
      setActiveTab('chat');
    } catch (err) {
      console.error("Error loading chat history:", err);
    }
  };

  const [activeConversationId, setActiveConversationId] = useState(null);

  const handleCreateNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setCitationOpen(false);
    setActiveTab('chat');
  };

  const handleSendMessage = async (text) => {
    if (!documentId || isGenerating) return;

    let currentConvId = activeConversationId;

    if (!currentConvId) {
      try {
        const title = `Chat on ${filename.substring(0, 20)}...`;
        const res = await createConversation(documentId, title);
        currentConvId = res.data.conversation_id;
        setActiveConversationId(currentConvId);
        fetchAllData();
        window.dispatchEvent(new Event('conversation-created'));
      } catch (err) {
        console.error("Failed to create lazy conversation:", err);
      }
    }

    const userMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    const botMessageIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'ai', text: '', source: '', chunks: [], confidence: 0 }]);

    let accumulatedText = '';

    await askQuestionStream(documentId, text, {
      conversationId: currentConvId,
      onToken: (token) => {
        accumulatedText += token;
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[botMessageIndex]) {
            updated[botMessageIndex] = {
              ...updated[botMessageIndex],
              text: accumulatedText,
            };
          }
          return updated;
        });
      },
      onSource: (source, chunks, confidence) => {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[botMessageIndex]) {
            updated[botMessageIndex] = {
              ...updated[botMessageIndex],
              source: source !== null ? source : updated[botMessageIndex].source,
              chunks: chunks !== null ? chunks : updated[botMessageIndex].chunks,
              confidence: confidence !== undefined ? confidence : updated[botMessageIndex].confidence,
            };
          }
          return updated;
        });
      },
      onError: (err) => {
        console.error("Streaming error: ", err);
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[botMessageIndex]) {
            updated[botMessageIndex] = {
              ...updated[botMessageIndex],
              text: accumulatedText || 'Something went wrong. Please try again.',
              source: 'N/A',
            };
          }
          return updated;
        });
        setIsGenerating(false);
      },
      onDone: () => {
        setIsGenerating(false);
        fetchAllData();
      },
    });
  };

  const handleRegenerate = () => {
    if (messages.length < 2 || isGenerating) return;

    let lastUserQuery = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserQuery = messages[i].text;
        break;
      }
    }

    if (!lastUserQuery) return;

    setMessages((prev) => {
      const idx = prev.findIndex((m, index) => index >= prev.length - 1 && m.role === 'ai');
      if (idx !== -1) {
        return prev.slice(0, idx);
      }
      return prev;
    });

    handleSendMessage(lastUserQuery);
  };

  const handleToggleBookmark = async (msgIndex, isBookmarked) => {
    if (!activeConversationId) return;
    try {
      await toggleBookmark(activeConversationId, msgIndex, isBookmarked);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[msgIndex]) {
          updated[msgIndex].bookmarked = isBookmarked;
        }
        return updated;
      });
    } catch (err) {
      console.error("Error setting bookmark:", err);
    }
  };

  const handleSendFeedback = async (msgIndex, feedbackVal) => {
    if (!activeConversationId) return;
    try {
      await sendFeedback(activeConversationId, msgIndex, feedbackVal);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[msgIndex]) {
          updated[msgIndex].feedback = feedbackVal;
        }
        return updated;
      });
    } catch (err) {
      console.error("Error setting feedback:", err);
    }
  };

  const handleOpenCitations = (chunks, confidence) => {
    setActiveCitations(chunks);
    setCitationConfidence(confidence);
    setCitationOpen(true);
  };

  // Pinned/rename/delete methods for conversations list
  const handleTogglePin = (convId, e) => {
    if (e) e.stopPropagation();
    let updated;
    if (pinnedChats.includes(convId)) {
      updated = pinnedChats.filter(id => id !== convId);
    } else {
      updated = [...pinnedChats, convId];
    }
    setPinnedChats(updated);
    localStorage.setItem('pinned_conversations', JSON.stringify(updated));
  };

  const handleStartRename = (convId, currentTitle, e) => {
    if (e) e.stopPropagation();
    setEditingChatId(convId);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = async (convId, e) => {
    if (e) e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await renameConversation(convId, editTitle.trim());
      setEditingChatId(null);
      fetchAllData();
    } catch (err) {
      console.error("Error renaming conversation: ", err);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat history?")) return;
    try {
      await deleteConversation(convId);
      if (activeConversationId === convId) {
        setMessages([]);
        setActiveConversationId(null);
      }
      fetchAllData();
      window.dispatchEvent(new Event('conversation-deleted'));
    } catch (err) {
      console.error("Error deleting conversation: ", err);
      if (err.response && err.response.status === 404) {
        fetchAllData();
        window.dispatchEvent(new Event('conversation-deleted'));
      } else {
        alert("Failed to delete conversation.");
      }
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document and its embeddings? This will also remove any conversations associated with this document.")) return;
    try {
      await deleteDocument(docId);
      if (documentId === docId) {
        setDocumentId('');
        setFilename('');
        setQuestions([]);
        setMessages([]);
        setActiveConversationId(null);
      }
      fetchAllData();
      window.dispatchEvent(new Event('document-deleted'));
    } catch (err) {
      console.error("Error deleting document:", err);
      if (err.response && err.response.status === 404) {
        fetchAllData();
        window.dispatchEvent(new Event('document-deleted'));
      } else {
        alert("Failed to delete document.");
      }
    }
  };

  // Group conversations helper
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

  // Format Helper Utilities
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const groupedConversations = getGroupedConversations();
  const lastBotMessageText = messages.length > 0 && messages[messages.length - 1].role === 'ai'
    ? messages[messages.length - 1].text
    : '';

  // Render a chat row in history
  const renderChatRow = (conv) => {
    const isSelected = activeConversationId === conv.conversation_id;
    const isEditing = editingChatId === conv.conversation_id;
    const isPinned = pinnedChats.includes(conv.conversation_id);

    return (
      <div
        key={conv.conversation_id}
        onClick={() => !isEditing && handleSelectConversation(conv.conversation_id)}
        className={`group relative flex items-center justify-between rounded-xl px-3 py-3 text-xs cursor-pointer transition-all border border-white/5 hover:border-cyan-500/30
          ${isSelected
            ? 'bg-slate-950/60 border-cyan-500/30 text-white font-medium shadow-lg shadow-cyan-500/5'
            : 'text-slate-400 hover:bg-slate-950/40 hover:text-slate-200'}
        `}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
          <MessageSquare className={`h-4 w-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
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
              className="w-full bg-slate-950 border border-cyan-500 rounded-lg px-2 py-0.5 text-xs text-white outline-none"
            />
          ) : (
            <span className="truncate">{conv.title}</span>
          )}
        </div>

        {/* Action icons */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => handleTogglePin(conv.conversation_id, e)}
              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white"
              title={isPinned ? "Unpin" : "Pin"}
            >
              <Pin className={`h-3 w-3 ${isPinned ? 'text-cyan-450 fill-cyan-455 rotate-45' : 'rotate-45'}`} />
            </button>
            <button
              onClick={(e) => handleStartRename(conv.conversation_id, conv.title, e)}
              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white"
              title="Rename"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => handleDeleteConversation(conv.conversation_id, e)}
              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {isEditing && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => handleSaveRename(conv.conversation_id, e)}
              className="text-emerald-450 hover:text-emerald-350"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setEditingChatId(null); }}
              className="text-red-450 hover:text-red-355"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#cce8e8', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative' }}>
      {/* Canvas animated background */}
      <MatrixBackground />

      {/* Main layout: sidebar + content — full viewport height, no top bar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100vh' }}>
        {/* Left Sidebar */}
        <AppSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSettings={() => setShowSettings(true)}
          apiStatus={apiStatus}
        />

        {/* Right slide-out Citations panel */}
        <SourcePanel
          isOpen={citationOpen}
          onClose={() => setCitationOpen(false)}
          chunks={activeCitations}
          confidence={citationConfidence}
          filename={filename}
        />

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            height: '100%',
            paddingRight: citationOpen ? 'calc(400px + 32px)' : '32px',
            transition: 'padding-right 0.3s ease',
          }}
        >
          <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>

            {/* 1. HOME SECTION */}
            {activeTab === 'home' && (
              <div style={{ maxWidth: 900, margin: '0 auto' }} className="space-y-8 animate-fade-in-up">

                {/* ── Hero Card ── */}
                <div
                  style={{
                    position: 'relative', overflow: 'hidden',
                    borderRadius: 20, padding: '28px 32px',
                    background: 'rgba(5,21,32,0.65)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(0,200,200,0.10)',
                    boxShadow: '0 4px 40px rgba(0,200,200,0.08)',
                  }}
                >
                  <div style={{
                    position: 'absolute', left: -40, top: -40,
                    width: 180, height: 180, borderRadius: '50%',
                    background: 'rgba(0,200,200,0.10)', filter: 'blur(60px)',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    position: 'absolute', right: -50, bottom: -50,
                    width: 200, height: 200, borderRadius: '50%',
                    background: 'rgba(139,92,246,0.08)', filter: 'blur(60px)',
                    pointerEvents: 'none',
                  }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <span className="badge badge-indigo" style={{ marginBottom: 12, display: 'inline-flex' }}>
                      <Sparkles className="h-3 w-3" /> Guardrails Active
                    </span>
                    <h2 style={{
                      fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px',
                      fontFamily: 'Outfit, Inter, sans-serif',
                    }}>
                      Instant Document{' '}
                      <span className="text-gradient-indigo">Question & Answering</span>
                    </h2>
                    <p style={{ fontSize: 13, color: 'rgba(150,200,200,0.7)', margin: 0, lineHeight: 1.6 }}>
                      Upload PDF or PPT/PPTX files. DocuMind parses content, builds FAISS vector indices,
                      extracts summaries, and lets you query without hallucinations.
                    </p>
                  </div>
                </div>

                {/* ── File Uploader ── */}
                <UploadArea onUploadSuccess={handleUploadSuccess} />

                {/* ── Stats ── */}
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="divider flex-1" />
                    <p className="section-label">RAG Dashboard Statistics</p>
                    <div className="divider flex-1" />
                  </div>
                  <DashboardMetrics
                    onSelectDocument={handleSelectDocument}
                    onSelectConversation={handleSelectConversation}
                    onOpenSettings={() => setShowSettings(true)}
                    activeDocumentId={documentId}
                  />
                </div>
              </div>
            )}

            {/* 2. CHAT WORKSPACE SECTION */}
            {activeTab === 'chat' && (
              <div className="max-w-6xl mx-auto h-full">
                {documentId ? (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left Panel: Document Metadata/Summary/Suggested Questions */}
                    <div className="space-y-6 lg:col-span-5 flex flex-col justify-start">
                      <DocumentStatus
                        documentInfo={{
                          filename,
                          documentId,
                        }}
                      />

                      <VoiceAssistant
                        onSpeechInput={handleSendMessage}
                        lastBotMessage={lastBotMessageText}
                        isGenerating={isGenerating}
                        disabled={!documentId || isGenerating}
                      />

                      <SuggestedQuestions
                        questions={questions}
                        onSelectQuestion={handleSendMessage}
                        disabled={isGenerating || !documentId}
                      />

                      <SummaryPanel
                        documentId={documentId}
                        hasDocument={!!documentId}
                      />
                    </div>

                    {/* Right Panel: Chat dialogue and input form */}
                    <div className="lg:col-span-7">
                      <ChatWindow
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        isGenerating={isGenerating}
                        hasDocument={!!documentId}
                        onRegenerate={handleRegenerate}
                        onToggleBookmark={handleToggleBookmark}
                        onSendFeedback={handleSendFeedback}
                        onOpenCitations={handleOpenCitations}
                        documentFilename={filename}
                      />
                    </div>
                  </div>
                ) : (
                  /* Empty state when no document is active */
                  <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-955/50 border border-white/10 text-cyan-400 shadow-xl shadow-cyan-500/10">
                      <MessageSquare className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white">No Active QA Session</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        To query files, please upload a new PDF or PPT document first, or select a previous chat/file from your history workspace.
                      </p>
                    </div>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setActiveTab('home')}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-955/40 hover:bg-slate-900 text-xs font-semibold text-white border border-white/5 transition-all"
                      >
                        Upload Document
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-450 hover:to-purple-500 text-xs font-semibold text-white shadow-lg shadow-cyan-500/10 transition-all active:scale-95"
                      >
                        Browse History
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. HISTORY & DOCUMENTS SECTION */}
            {activeTab === 'history' && (
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-4 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Workspace History</h2>
                    <p className="text-xs text-slate-400">Manage your past chatbot sessions and uploaded source files</p>
                  </div>

                  {/* Search Bar for filtering chats */}
                  <div className="relative flex items-center rounded-xl border border-white/5 bg-slate-955/40 px-3.5 py-2 w-full md:max-w-xs focus-within:border-cyan-500 transition-colors backdrop-blur-sm">
                    <Search className="h-4 w-4 text-slate-500 mr-2.5" />
                    <input
                      type="text"
                      placeholder="Search chat sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder-slate-500"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')}>
                        <X className="h-3.5 w-3.5 text-slate-500 hover:text-slate-350" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Chat Conversations (Pinnable/Editable/Deletable) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chat Conversations</h3>
                      <button
                        onClick={handleCreateNewChat}
                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300"
                      >
                        + Create Fresh Session
                      </button>
                    </div>

                    <div className="bg-slate-955/30 border border-white/5 rounded-2xl p-4 max-h-[550px] overflow-y-auto space-y-4 scrollbar-thin backdrop-blur-md">
                      {/* Pinned Chats */}
                      {groupedConversations.pinned.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Pin className="h-3 w-3 text-cyan-400 rotate-45" />
                            Pinned Conversations
                          </div>
                          {groupedConversations.pinned.map(c => renderChatRow(c))}
                        </div>
                      )}

                      {/* Today */}
                      {groupedConversations.today.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Today</div>
                          {groupedConversations.today.map(c => renderChatRow(c))}
                        </div>
                      )}

                      {/* Yesterday */}
                      {groupedConversations.yesterday.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Yesterday</div>
                          {groupedConversations.yesterday.map(c => renderChatRow(c))}
                        </div>
                      )}

                      {/* Previous */}
                      {groupedConversations.previous.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Earlier</div>
                          {groupedConversations.previous.map(c => renderChatRow(c))}
                        </div>
                      )}

                      {conversations.length === 0 && (
                        <div className="text-center text-xs text-slate-650 py-12">
                          No conversation history available.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Uploaded Documents Table */}
                  <div className="lg:col-span-7 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Uploaded Source Documents</h3>

                    <div className="bg-slate-955/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-955/20">
                              <th className="py-3.5 px-4">Filename</th>
                              <th className="py-3.5 px-3">Upload Date</th>
                              <th className="py-3.5 px-3">File Size</th>
                              <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs text-slate-350">
                            {documents.map((doc) => (
                              <tr key={doc.document_id} className="hover:bg-slate-955/20 group transition-colors">
                                <td className="py-3.5 px-4 font-medium text-slate-200">
                                  <div className="flex items-center gap-2 max-w-xs md:max-w-sm truncate">
                                    <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                                    <span className="truncate" title={doc.filename}>{doc.filename}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 text-slate-400">{formatDate(doc.upload_time)}</td>
                                <td className="py-3.5 px-3 text-slate-400">{formatBytes(doc.file_size)}</td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleSelectDocument(doc.document_id, doc.filename)}
                                      className="px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-cyan-500/30 bg-slate-955/60 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                      Chat QA
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteDocument(doc.document_id, e)}
                                      className="p-1.5 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-900/50 text-slate-500 hover:text-red-400 transition-colors"
                                      title="Delete Document"
                                    >
                                      <Trash className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}

                            {documents.length === 0 && (
                              <tr>
                                <td colSpan="4" className="py-12 text-center text-xs text-slate-650">
                                  No source files uploaded yet. Go to the Home tab to add files.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
