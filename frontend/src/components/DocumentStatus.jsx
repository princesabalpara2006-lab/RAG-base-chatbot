import React from 'react';
import { FileText, Cpu, CheckCircle, Database } from 'lucide-react';

export default function DocumentStatus({ documentInfo }) {
  if (!documentInfo) return null;

  const isPdf = documentInfo.filename.toLowerCase().endsWith('.pdf');
  const sizeFormatted = documentInfo.size ? `${(documentInfo.size / 1024 / 1024).toFixed(2)} MB` : '';

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/20 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md
            ${isPdf ? 'bg-gradient-to-tr from-rose-600 to-rose-400' : 'bg-gradient-to-tr from-amber-600 to-amber-400'}
          `}>
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg" title={documentInfo.filename}>
                {documentInfo.filename}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase
                ${isPdf ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}
              `}>
                {isPdf ? 'PDF' : 'PPTX'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">ID: {documentInfo.documentId.substring(0, 8)}...</span>
              {sizeFormatted && (
                <>
                  <span className="text-[10px] text-slate-650">•</span>
                  <span className="text-xs text-slate-400">{sizeFormatted}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 font-medium">
            <Database className="h-3.5 w-3.5" />
            <span>FAISS Index Loaded</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-xs text-brand-400 font-medium">
            <Cpu className="h-3.5 w-3.5 animate-pulse" />
            <span>Llama-3 Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
