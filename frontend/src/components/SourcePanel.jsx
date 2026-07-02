import React from 'react';
import { X, Search, FileText, Sparkles, Scale, Info } from 'lucide-react';

export default function SourcePanel({ 
  chunks, 
  confidence, 
  isOpen, 
  onClose,
  filename
}) {
  if (!isOpen) return null;

  // Format confidence score as a percentage
  const confidencePercent = confidence ? Math.round(confidence * 100) : 0;

  // Determine confidence styling
  const getConfidenceStyle = (score) => {
    if (score >= 0.7) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (score >= 0.4) return 'bg-brand-500/10 text-brand-400 border border-brand-500/20';
    return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  };

  const getConfidenceLabel = (score) => {
    if (score >= 0.7) return 'Excellent Match';
    if (score >= 0.4) return 'Good Match';
    return 'Low Confidence';
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-80 sm:w-96 flex-col border-l border-slate-850 bg-slate-950/90 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-in-out text-left select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-850 bg-slate-950/50 p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4.5 w-4.5 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">Source Citations</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-slate-900 text-slate-400 hover:text-white"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Main Content scrollable area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        {/* Global Confidence Score Card */}
        {confidence !== undefined && confidence > 0 && (
          <div className="rounded-xl border border-slate-850 bg-slate-900/10 p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Overall RAG Confidence</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">{confidencePercent}%</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getConfidenceStyle(confidence)}`}>
                {getConfidenceLabel(confidence)}
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
                style={{ width: `${confidencePercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Citations List */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            Retrieved Passages ({chunks?.length || 0})
          </div>

          {chunks && chunks.map((chunk, index) => {
            const isPdf = chunk.type === 'pdf';
            const sourceLabel = isPdf ? `Page ${chunk.page}` : `Slide ${chunk.page}`;
            return (
              <div 
                key={index} 
                className="rounded-xl border border-slate-850/60 bg-slate-900/10 p-4 space-y-3 hover:border-slate-800 transition-colors"
              >
                {/* Passage Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase
                      ${isPdf ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}
                    `}>
                      {sourceLabel}
                    </span>
                    <span className="text-slate-400 max-w-[120px] truncate" title={filename || chunk.source}>
                      {filename || chunk.source}
                    </span>
                  </div>

                  {chunk.score && (
                    <span className="text-[10px] font-mono text-brand-400 bg-brand-500/5 px-2 py-0.5 rounded-md border border-brand-500/10">
                      Score: {chunk.score.toFixed(3)}
                    </span>
                  )}
                </div>

                {/* Text Block */}
                <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-900 select-text">
                  <p className="text-xs text-slate-350 leading-relaxed font-normal whitespace-pre-wrap">
                    {chunk.text}
                  </p>
                </div>
              </div>
            );
          })}

          {(!chunks || chunks.length === 0) && (
            <div className="rounded-xl border border-slate-850/60 p-6 text-center text-slate-500 text-xs">
              <Info className="h-5 w-5 text-slate-600 mx-auto mb-2" />
              No citation information available for this message.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
