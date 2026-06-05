import React, { useState } from 'react';
import { FileText, Sparkles, Loader2 } from 'lucide-react';
import { getDocumentSummary } from '../services/api';

export default function SummaryPanel({ documentId, hasDocument }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateSummary = async () => {
    if (!documentId) return;
    setLoading(true);
    setError('');
    setSummary('');

    try {
      const res = await getDocumentSummary(documentId);
      setSummary(res.data.summary);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to generate document summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset summary if documentId changes
  React.useEffect(() => {
    setSummary('');
    setError('');
  }, [documentId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/10 p-5 backdrop-blur-sm flex flex-col h-[280px]">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 shrink-0">
        <FileText className="h-4.5 w-4.5 text-brand-400" />
        <h3 className="text-sm font-semibold text-slate-200">Document Summary</h3>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col justify-center items-center text-center">
        {!hasDocument && (
          <p className="text-xs text-slate-500 max-w-xs">
            Upload a document to enable summary generation.
          </p>
        )}

        {hasDocument && !summary && !loading && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 max-w-xs">
              Generate a concise, structured summary highlighting the main points of the document.
            </p>
            <button
              onClick={handleGenerateSummary}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-650 to-brand-550 hover:from-brand-600 hover:to-brand-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Summary
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400 mx-auto" />
            <p className="text-xs text-brand-400 font-medium">Generating summary...</p>
            <p className="text-[10px] text-slate-500">This may take a moment depending on length</p>
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <p className="text-xs text-red-400 font-medium">{error}</p>
            <button
              onClick={handleGenerateSummary}
              className="text-xs text-brand-400 underline font-semibold hover:text-brand-350"
            >
              Try again
            </button>
          </div>
        )}

        {summary && (
          <div className="w-full h-full text-left align-top select-text">
            <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {summary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
