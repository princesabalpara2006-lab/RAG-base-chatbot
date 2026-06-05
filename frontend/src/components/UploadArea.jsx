import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../services/api';

export default function UploadArea({ onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const validateAndUploadFile = (selectedFile) => {
    if (!selectedFile) return;

    const filename = selectedFile.name.toLowerCase();
    const ext = filename.substring(filename.lastIndexOf('.'));
    if (!['.pdf', '.ppt', '.pptx'].includes(ext)) {
      setStatus('error');
      setErrorMsg('Only PDF and PPT files are supported.');
      return;
    }

    setFile(selectedFile);
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    uploadDocument(selectedFile, (percent) => {
      setProgress(percent);
    })
      .then((res) => {
        setStatus('success');
        if (onUploadSuccess) {
          onUploadSuccess(res.data);
        }
      })
      .catch((err) => {
        setStatus('error');
        const detail = err.response?.data?.detail || 'Something went wrong. Please try again.';
        setErrorMsg(detail);
        setFile(null);
      });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUploadFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={status === 'idle' || status === 'error' || status === 'success' ? onButtonClick : undefined}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer select-none
          ${dragActive ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-slate-750 hover:bg-slate-900/60'}
          ${status === 'uploading' ? 'glow-pulse border-brand-500/50 pointer-events-none' : ''}
          ${status === 'success' ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
          ${status === 'error' ? 'border-red-500/50 bg-red-500/5' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.ppt,.pptx"
          onChange={handleChange}
        />

        {status === 'idle' && (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:text-slate-350 transition-colors">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-md font-semibold text-white">Upload your document</h3>
            <p className="mt-1 text-xs text-slate-400">
              Drag and drop PDF or PPT/PPTX here, or click to browse
            </p>
            <span className="mt-4 rounded-md bg-slate-950/50 px-2.5 py-1 text-[10px] font-medium text-slate-400 border border-slate-850">
              Max file size 25MB
            </span>
          </>
        )}

        {status === 'uploading' && (
          <div className="w-full max-w-xs">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500 mb-3" />
            <h3 className="text-sm font-semibold text-white">Uploading & indexing...</h3>
            <p className="text-xs text-slate-400 mt-1 truncate">{file?.name}</p>
            
            <div className="mt-4 h-2 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs text-brand-400 font-semibold mt-2 block">{progress}%</span>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="text-md font-semibold text-white">Document Processed</h3>
            <p className="mt-1 text-xs text-emerald-400 font-medium truncate max-w-xs">
              {file?.name}
            </p>
            <p className="mt-3 text-[11px] text-slate-400">
              Click to replace with another file
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-md font-semibold text-white">Upload Failed</h3>
            <p className="mt-1 text-xs text-red-400 font-medium">
              {errorMsg}
            </p>
            <p className="mt-3 text-[11px] text-slate-400">
              Click to try again
            </p>
          </>
        )}
      </div>
    </div>
  );
}
