import React, { useState, useEffect } from 'react';
import {
  FileText, MessageSquare, HardDrive, Sparkles, Clock, Trash2,
  Play, Key, FileCheck, ArrowRight, RefreshCw, AlertCircle
} from 'lucide-react';
import { getStats, deleteDocument } from '../services/api';

export default function DashboardMetrics({
  onSelectDocument,
  onSelectConversation,
  onOpenSettings,
  activeDocumentId
}) {
  const [data, setData] = useState({
    metrics: {
      total_documents: 0,
      total_chats: 0,
      storage_usage_bytes: 0,
      total_questions: 0,
      average_response_time: 0.0
    },
    recent_documents: [],
    recent_conversations: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await getStats();
      setData(res.data);
      setError('');
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
      setError('Unable to load server stats. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Listen for custom settings or database updates to refresh stats
    window.addEventListener('settings-updated', loadStats);
    window.addEventListener('document-uploaded', loadStats);
    window.addEventListener('document-deleted', loadStats);
    window.addEventListener('conversation-deleted', loadStats);
    window.addEventListener('conversation-created', loadStats);
    return () => {
      window.removeEventListener('settings-updated', loadStats);
      window.removeEventListener('document-uploaded', loadStats);
      window.removeEventListener('document-deleted', loadStats);
      window.removeEventListener('conversation-deleted', loadStats);
      window.removeEventListener('conversation-created', loadStats);
    };
  }, []);

  const handleDeleteDoc = async (docId, e) => {
    e.stopPropagation();
    if (!window.confirm("This will permanently delete this document and all its chat histories. Proceed?")) return;
    try {
      await deleteDocument(docId);
      // Dispatch event to notify other components (like Dashboard)
      window.dispatchEvent(new Event('document-deleted'));
      loadStats();
      // Notify parent to reset document if the deleted one was active
      if (activeDocumentId === docId) {
        onSelectDocument('', '');
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      if (err.response && err.response.status === 404) {
        window.dispatchEvent(new Event('document-deleted'));
        loadStats();
        if (activeDocumentId === docId) {
          onSelectDocument('', '');
        }
      } else {
        alert("Failed to delete document.");
      }
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (loading && !data.recent_documents.length) {
    return (
      <div className="flex h-[400px] items-center justify-center text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-brand-400 mr-2" />
        <span className="text-sm font-semibold">Loading system metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none text-left">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-slate-955/40 backdrop-blur-xl p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl"></div>
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent">
            Welcome to DocuMind RAG
          </h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed sm:text-sm">
            Upload document PDFs or PowerPoint presentations, generate structural summaries, and ask highly specific questions with local embeddings and strict guardrails.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 font-semibold">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Metrics Card Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Documents */}
        <div className="glass-panel-interactive rounded-2xl p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 text-white shadow-md shadow-cyan-500/10">
            <FileText className="h-4 w-4" />
          </div>
          <span className="block mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Documents</span>
          <span className="text-xl font-extrabold text-white mt-1 block">{data.metrics.total_documents}</span>
        </div>

        {/* Total Chats */}
        <div className="glass-panel-interactive rounded-2xl p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-purple-400 text-white shadow-md shadow-purple-500/10">
            <MessageSquare className="h-4 w-4" />
          </div>
          <span className="block mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Chats</span>
          <span className="text-xl font-extrabold text-white mt-1 block">{data.metrics.total_chats}</span>
        </div>

        {/* Storage Size */}
        <div className="glass-panel-interactive rounded-2xl p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-500/10">
            <HardDrive className="h-4 w-4" />
          </div>
          <span className="block mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Vector Storage</span>
          <span className="text-xl font-extrabold text-white mt-1 block truncate" title={formatBytes(data.metrics.storage_usage_bytes)}>
            {formatBytes(data.metrics.storage_usage_bytes)}
          </span>
        </div>

        {/* AI Queries */}
        <div className="glass-panel-interactive rounded-2xl p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 to-pink-400 text-white shadow-md shadow-pink-500/10">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="block mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Questions Asked</span>
          <span className="text-xl font-extrabold text-white mt-1 block">{data.metrics.total_questions}</span>
        </div>

        {/* Response Time */}
        <div className="col-span-2 sm:col-span-1 glass-panel-interactive rounded-2xl p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-550 text-white shadow-md shadow-purple-500/10">
            <Clock className="h-4 w-4" />
          </div>
          <span className="block mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg LLM Speed</span>
          <span className="text-xl font-extrabold text-white mt-1 block">{data.metrics.average_response_time}s</span>
        </div>
      </div>

      {/* Main Grid: Left = Recent Docs, Right = Quick Actions & Recent Chats */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Recent Documents Table */}
        <div className="glass-panel rounded-2xl p-5 lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Available Documents</h3>
            </div>
            <button
              onClick={loadStats}
              className="text-xs text-slate-500 hover:text-cyan-400 flex items-center gap-1 font-semibold transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2.5">Name</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Size</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recent_documents.map((doc) => {
                  const isActive = activeDocumentId === doc.document_id;
                  const isPdf = doc.filename.toLowerCase().endsWith('.pdf');
                  return (
                    <tr
                      key={doc.document_id}
                      onClick={() => onSelectDocument(doc.document_id, doc.filename)}
                      className={`hover:bg-slate-955/30 cursor-pointer transition-colors group
                        ${isActive ? 'bg-slate-955/20' : ''}
                      `}
                    >
                      <td className="py-3 font-medium text-slate-200 flex items-center gap-2 max-w-[200px] sm:max-w-xs truncate">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`}></span>
                        <span className="truncate" title={doc.filename}>{doc.filename}</span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase
                          ${isPdf ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' : 'bg-amber-500/10 text-amber-455 border border-amber-500/20'}
                        `}>
                          {isPdf ? 'PDF' : 'PPTX'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-[11px]">
                        {formatBytes(doc.file_size)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDocument(doc.document_id, doc.filename);
                            }}
                            className="h-7 w-7 rounded-lg bg-slate-955 border border-white/5 hover:border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Chat with doc"
                          >
                            <Play className="h-3.5 w-3.5 fill-cyan-400/20" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteDoc(doc.document_id, e)}
                            className="h-7 w-7 rounded-lg bg-slate-955 border border-white/5 hover:border-red-500/20 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {data.recent_documents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                      No documents index available. Drag & drop files above to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Recent Chats */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Actions */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-white/5 pb-3 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={onOpenSettings}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-955/20 hover:bg-slate-955/40 p-3 text-xs text-left text-slate-300 transition-all hover:border-cyan-500/20"
              >
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-400" />
                  <div>
                    <span className="font-semibold block text-slate-250">API Configuration</span>
                    <span className="text-[10px] text-slate-500">Provide Groq, OpenAI, or Gemini keys</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
              </button>

              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-955/20 p-3 text-xs text-left text-slate-350">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold block text-slate-400">FAISS Index Engine</span>
                    <span className="text-[10px] text-slate-500">Local fast vectorized search active</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
              </div>
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-white/5 pb-3 flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-purple-400" />
              Recent Conversations
            </h3>
            <div className="space-y-2">
              {data.recent_conversations.map((c) => (
                <div
                  key={c.conversation_id}
                  onClick={() => onSelectConversation(c.conversation_id)}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-955/20 hover:bg-slate-955/40 p-2.5 text-xs text-slate-300 cursor-pointer transition-all hover:border-cyan-500/20"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <MessageSquare className="h-4 w-4 text-slate-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold truncate block text-slate-200">{c.title}</span>
                      <span className="text-[10px] text-slate-500">{c.message_count} messages</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(c.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}

              {data.recent_conversations.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No recent conversations active
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
