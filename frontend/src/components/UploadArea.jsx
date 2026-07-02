import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Loader2, Sparkles, File } from 'lucide-react';
import { uploadDocument } from '../services/api';

const STAGES = [
  'Uploading document to server…',
  'Extracting text & slide content…',
  'Splitting into semantic chunks…',
  'Generating vector embeddings…',
  'Building FAISS index on disk…',
  'Pre-compiling suggested queries…',
];

const FORMATS = [
  { label: 'PDF', color: 'rgba(239,68,68,0.8)' },
  { label: 'PPT', color: 'rgba(245,158,11,0.8)' },
  { label: 'PPTX', color: 'rgba(99,102,241,0.8)' },
];

export default function UploadArea({ onUploadSuccess }) {
  const [drag, setDrag]   = useState(false);
  const [file, setFile]   = useState(null);
  const [progress, setProgress]       = useState(0);
  const [status, setStatus]           = useState('idle'); // idle | uploading | success | error
  const [errorMsg, setErrorMsg]       = useState('');
  const [stage, setStage]             = useState('');
  const stageTimer = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    if (status === 'uploading' && progress === 100) {
      let idx = 1;
      setStage(STAGES[idx]);
      stageTimer.current = setInterval(() => {
        idx++;
        if (idx < STAGES.length) setStage(STAGES[idx]);
        else clearInterval(stageTimer.current);
      }, 3000);
    }
    return () => clearInterval(stageTimer.current);
  }, [status, progress]);

  const validate = (f) => {
    if (!f) return;
    const ext = f.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!['.pdf', '.ppt', '.pptx'].includes(ext)) {
      setStatus('error');
      setErrorMsg('Only PDF and PPT/PPTX files are supported.');
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setStatus('error');
      setErrorMsg('File exceeds the 25 MB size limit.');
      return;
    }

    setFile(f);
    setStatus('uploading');
    setProgress(0);
    setStage(STAGES[0]);
    setErrorMsg('');

    uploadDocument(f, (pct) => {
      setProgress(pct);
      if (pct < 100) setStage(`Uploading… ${pct}%`);
    })
      .then((res) => {
        clearInterval(stageTimer.current);
        setStatus('success');
        window.dispatchEvent(new Event('document-uploaded'));
        onUploadSuccess?.(res.data);
      })
      .catch((err) => {
        clearInterval(stageTimer.current);
        setStatus('error');
        setErrorMsg(err.response?.data?.detail || 'Something went wrong. Please try again.');
        setFile(null);
      });
  };

  const onDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDrag(e.type === 'dragenter' || e.type === 'dragover');
  };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDrag(false);
    validate(e.dataTransfer.files?.[0]);
  };
  const onChange = (e) => validate(e.target.files?.[0]);
  const onClick  = () => {
    if (['idle','error','success'].includes(status)) inputRef.current.click();
  };

  // ── Idle State ─────────────────────────────────────────────────
  const IdleContent = () => (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* Icon */}
      <div className="relative">
        <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(0,200,200,0.18) 0%, rgba(139,92,246,0.12) 100%)',
          border: '1px solid rgba(0,200,200,0.28)',
          boxShadow: '0 8px 32px rgba(0,200,200,0.22)',
        }}
      >
        <UploadCloud className="h-7 w-7 text-teal-400" />
        </div>
        {drag && (
          <span className="absolute inset-0 rounded-2xl animate-ping"
            style={{ background: 'rgba(99,102,241,0.15)' }} />
        )}
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5">
        <h3 className="text-base font-bold text-white">
          {drag ? 'Drop your document here' : 'Upload your document'}
        </h3>
        <p className="text-xs text-slate-400">
          Drag & drop or{' '}
          <span className="text-teal-400 font-semibold cursor-pointer hover:text-teal-300 transition-colors">
            browse files
          </span>
        </p>
      </div>

      {/* Format badges */}
      <div className="flex items-center gap-2">
        {FORMATS.map(({ label, color }) => (
          <span
            key={label}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: color.replace('0.8', '0.12'),
              border: `1px solid ${color.replace('0.8', '0.35')}`,
              color: color.replace('0.8', '1'),
            }}
          >
            {label}
          </span>
        ))}
        <span
          className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#64748b',
          }}
        >
          Max 25 MB
        </span>
      </div>
    </div>
  );

  // ── Uploading State ────────────────────────────────────────────
  const UploadingContent = () => (
    <div className="flex flex-col items-center gap-4 py-4 w-full max-w-sm">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: 'rgba(0,200,200,0.10)',
          border: '1px solid rgba(0,200,200,0.25)',
        }}
      >
        <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
      </div>

      <div className="text-center space-y-1 w-full px-4">
        <p className="text-sm font-bold text-white">Processing Document</p>
        <p className="text-[11px] text-teal-400 font-medium animate-pulse min-h-[1rem]">
          {stage}
        </p>
        {file && (
          <p className="text-[10px] text-slate-500 truncate">{file.name}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs px-4 space-y-1.5">
        <div
          className="h-1.5 w-full rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
          background: 'linear-gradient(90deg, #00c8c8, #06b6d4, #8b5cf6)',
          boxShadow: '0 0 8px rgba(0,200,200,0.55)',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Indexing…</span>
          <span className="text-teal-400 font-bold">{progress}%</span>
        </div>
      </div>
    </div>
  );

  // ── Success State ──────────────────────────────────────────────
  const SuccessContent = () => (
    <div className="flex flex-col items-center gap-4 py-4">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.3)',
          boxShadow: '0 4px 20px rgba(16,185,129,0.2)',
        }}
      >
        <CheckCircle2 className="h-7 w-7 text-emerald-400" />
      </div>
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <p className="text-sm font-bold text-white">Document Indexed!</p>
        </div>
        <p className="text-xs text-emerald-400 font-medium truncate max-w-[240px]">
          {file?.name}
        </p>
        <p className="text-[10px] text-slate-500 mt-1">Switching to chat… or click to upload another</p>
      </div>
    </div>
  );

  // ── Error State ────────────────────────────────────────────────
  const ErrorContent = () => (
    <div className="flex flex-col items-center gap-4 py-4">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
        }}
      >
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-white">Upload Failed</p>
        <p className="text-xs text-red-400 font-medium max-w-xs">{errorMsg}</p>
        <p className="text-[10px] text-slate-500 mt-1">Click to try again</p>
      </div>
    </div>
  );

  // ── Border color by status ─────────────────────────────────────
  const borderStyle = {
    idle:      drag
      ? 'rgba(99,102,241,0.6)'
      : 'rgba(255,255,255,0.1)',
    uploading: 'rgba(99,102,241,0.5)',
    success:   'rgba(16,185,129,0.45)',
    error:     'rgba(239,68,68,0.45)',
  }[status];

  const bgStyle = {
    idle:      drag ? 'rgba(99,102,241,0.06)' : 'rgba(11,15,30,0.45)',
    uploading: 'rgba(99,102,241,0.04)',
    success:   'rgba(16,185,129,0.04)',
    error:     'rgba(239,68,68,0.04)',
  }[status];

  return (
    <div className="w-full select-none">
      <div
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={onDrag}
        onDrop={onDrop}
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed
          text-center transition-all duration-300
          ${status !== 'uploading' ? 'cursor-pointer' : 'pointer-events-none'}
          ${status === 'uploading' ? 'glow-pulse' : ''}
        `}
        style={{
          borderColor: borderStyle,
          background: bgStyle,
          backdropFilter: 'blur(16px)',
          padding: '2rem 1.5rem',
          minHeight: '220px',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.ppt,.pptx"
          onChange={onChange}
        />

        {/* Corner accents */}
        {status === 'idle' && (
          <>
            <span className="absolute top-3 left-3 w-4 h-4 border-t border-l rounded-tl-lg"
              style={{ borderColor: drag ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.12)' }} />
            <span className="absolute top-3 right-3 w-4 h-4 border-t border-r rounded-tr-lg"
              style={{ borderColor: drag ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.12)' }} />
            <span className="absolute bottom-3 left-3 w-4 h-4 border-b border-l rounded-bl-lg"
              style={{ borderColor: drag ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.12)' }} />
            <span className="absolute bottom-3 right-3 w-4 h-4 border-b border-r rounded-br-lg"
              style={{ borderColor: drag ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.12)' }} />
          </>
        )}

        {status === 'idle'      && <IdleContent />}
        {status === 'uploading' && <UploadingContent />}
        {status === 'success'   && <SuccessContent />}
        {status === 'error'     && <ErrorContent />}
      </div>
    </div>
  );
}
