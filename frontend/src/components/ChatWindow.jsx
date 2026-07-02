import React, { useEffect, useRef, useState } from 'react';
import {
  Send, User, Bot, ArrowDown, Copy, Check, RotateCcw,
  ThumbsUp, ThumbsDown, Star, MessageSquareCode, Paperclip
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatWindow({
  messages,
  onSendMessage,
  isGenerating,
  hasDocument,
  onRegenerate,
  onToggleBookmark,
  onSendFeedback,
  onOpenCitations,
  documentFilename
}) {
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 300;
    setShowScrollBtn(isScrolledUp);
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating || !hasDocument) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Custom components for ReactMarkdown to render custom code blocks, tables, lists, and links
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      return !inline && match ? (
        <div className="my-3 rounded-xl overflow-hidden border border-white/5 bg-slate-955 font-mono text-xs shadow-md">
          <div className="bg-slate-950/60 px-4 py-2 flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-white/5">
            <span className="flex items-center gap-1.5 uppercase">
              <MessageSquareCode className="h-3.5 w-3.5 text-cyan-400" />
              {match[1]}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(codeString)}
              className="hover:text-white transition-colors"
            >
              Copy Code
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-slate-200">
            <code>{children}</code>
          </pre>
        </div>
      ) : (
        <code className="bg-slate-955/80 px-1.5 py-0.5 rounded text-cyan-300 text-xs font-mono border border-white/5" {...props}>
          {children}
        </code>
      );
    },
    table({ children }) {
      return (
        <div className="my-4 overflow-x-auto rounded-lg border border-white/5 bg-slate-950/30">
          <table className="w-full text-left text-xs border-collapse">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-slate-955/50 border-b border-white/5 font-bold text-slate-300">{children}</thead>;
    },
    tr({ children }) {
      return <tr className="border-b border-white/5 hover:bg-slate-950/10 transition-colors">{children}</tr>;
    },
    th({ children }) {
      return <th className="px-4 py-2">{children}</th>;
    },
    td({ children }) {
      return <td className="px-4 py-2 text-slate-350">{children}</td>;
    },
    ul({ children }) {
      return <ul className="list-disc pl-5 my-2 space-y-1 text-slate-300">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-300">{children}</ol>;
    },
    li({ children }) {
      return <li className="leading-relaxed">{children}</li>;
    },
    a({ href, children }) {
      return <a href={href} target="_blank" rel="noreferrer" className="text-cyan-405 hover:text-cyan-300 underline">{children}</a>;
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-2xl border border-white/5 bg-slate-955/20 backdrop-blur-md overflow-hidden text-left relative">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 bg-slate-955/40 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${hasDocument ? 'bg-emerald-500 animate-pulse' : 'bg-slate-650'}`}></span>
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]" title={documentFilename}>
            {hasDocument ? `Doc: ${documentFilename}` : 'No Document Active'}
          </span>
        </div>
        {isGenerating && (
          <span className="text-xs text-cyan-400 font-medium animate-pulse flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            AI is writing...
          </span>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-6 relative scrollbar-thin select-text"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-500 p-8 text-center select-none">
            <Bot className="h-12 w-12 text-slate-600 mb-3" />
            <h4 className="text-sm font-semibold text-slate-400">Ask Document Anything</h4>
            <p className="max-w-xs text-xs text-slate-500 mt-1.5 leading-relaxed">
              {hasDocument
                ? 'Type your question below or choose a suggested topic. Answers are constrained strictly to your file contents.'
                : 'Please drag & drop or upload a file PDF or PPTX on the left to start query sessions.'}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const hasCitations = msg.chunks && msg.chunks.length > 0;
            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-[90%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg text-white font-semibold text-sm shadow-sm
                  ${isUser ? 'bg-gradient-to-tr from-cyan-600 to-purple-600' : 'bg-slate-950 border border-white/5'}
                `}>
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-cyan-400" />}
                </div>

                {/* Message Bubble Panel */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed border
                    ${isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-purple-600 border-cyan-500/20 text-white rounded-tr-none shadow-sm'
                      : 'bg-slate-955/45 border-white/5 text-slate-200 rounded-tl-none'}
                  `}>
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <div className="prose prose-invert prose-xs max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Actions & Citations row */}
                  {!isUser && (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 px-1 select-none">
                      {/* Citations badges */}
                      {msg.source && msg.source !== 'N/A' && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500">Source:</span>
                          <button
                            onClick={() => onOpenCitations && onOpenCitations(msg.chunks || [], msg.confidence)}
                            className="inline-flex items-center rounded-md bg-slate-950 hover:bg-slate-900 px-2 py-0.5 font-medium text-cyan-400 hover:text-cyan-300 border border-white/5 transition-colors"
                            title="Click to view text citation details"
                          >
                            {msg.source}
                          </button>
                        </div>
                      )}

                      {/* Tool Actions */}
                      <div className="flex items-center gap-2.5 ml-auto">
                        {/* Copy */}
                        <button
                          onClick={() => handleCopyText(msg.text, idx)}
                          className="hover:text-slate-350 flex items-center gap-1"
                          title="Copy response"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {/* Regenerate (last AI message only) */}
                        {idx === messages.length - 1 && onRegenerate && (
                          <button
                            onClick={onRegenerate}
                            disabled={isGenerating}
                            className="hover:text-slate-350 flex items-center gap-1 disabled:opacity-40"
                            title="Regenerate response"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Regenerate</span>
                          </button>
                        )}

                        {/* Star/Bookmark */}
                        {onToggleBookmark && (
                          <button
                            onClick={() => onToggleBookmark(idx, !msg.bookmarked)}
                            className={`hover:text-amber-400 flex items-center gap-1 transition-colors
                              ${msg.bookmarked ? 'text-amber-400 font-bold' : ''}
                            `}
                            title="Bookmark response"
                          >
                            <Star className={`h-3 w-3 ${msg.bookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                            <span>{msg.bookmarked ? 'Saved' : 'Bookmark'}</span>
                          </button>
                        )}

                        {/* Thumbs Up */}
                        {onSendFeedback && (
                          <button
                            onClick={() => onSendFeedback(idx, msg.feedback === 'like' ? null : 'like')}
                            className={`hover:text-emerald-400 transition-colors ${msg.feedback === 'like' ? 'text-emerald-400 font-semibold' : ''}`}
                            title="Thumbs Up"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Thumbs Down */}
                        {onSendFeedback && (
                          <button
                            onClick={() => onSendFeedback(idx, msg.feedback === 'dislike' ? null : 'dislike')}
                            className={`hover:text-red-400 transition-colors ${msg.feedback === 'dislike' ? 'text-red-400 font-semibold' : ''}`}
                            title="Thumbs Down"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Streaming Placeholder typing bubble */}
        {isGenerating && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 max-w-[80%] mr-auto select-none">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 border border-white/5 text-cyan-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-slate-955/45 border border-white/5 px-4 py-2.5 flex items-center gap-1">
              <span className="dot h-2 w-2 rounded-full bg-cyan-400"></span>
              <span className="dot h-2 w-2 rounded-full bg-cyan-400"></span>
              <span className="dot h-2 w-2 rounded-full bg-cyan-400"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating scroll down button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-8 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:scale-105 text-white shadow-lg border border-white/5 transition-all"
        >
          <ArrowDown className="h-4.5 w-4.5" />
        </button>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="border-t border-white/5 bg-slate-955/40 p-4 shrink-0 select-none">
        <div className="relative flex items-center rounded-xl border border-white/5 bg-slate-955/60 focus-within:border-cyan-500 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasDocument || isGenerating}
            placeholder={
              hasDocument
                ? "Ask a question about the document... (Press Enter to send)"
                : "Please upload a document first..."
            }
            rows={1}
            className="w-full resize-none bg-transparent py-3 pl-4 pr-12 text-sm text-slate-100 placeholder-slate-500 outline-none disabled:cursor-not-allowed disabled:placeholder-slate-700"
          />
          <button
            type="submit"
            disabled={!hasDocument || isGenerating || !input.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-md shadow-cyan-500/10 text-white transition-colors disabled:bg-slate-850 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
