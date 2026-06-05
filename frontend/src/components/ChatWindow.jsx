import React, { useEffect, useRef, useState } from 'react';
import { Send, User, Bot, AlertTriangle, ArrowDown } from 'lucide-react';

export default function ChatWindow({ messages, onSendMessage, isGenerating, hasDocument }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Handle scroll events to show/hide "scroll to bottom" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Show button if user scrolled up significantly
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

  return (
    <div className="flex flex-col h-[550px] rounded-2xl border border-slate-800 bg-slate-900/10 backdrop-blur-sm overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${hasDocument ? 'bg-emerald-500 animate-pulse' : 'bg-slate-650'}`}></span>
          <span className="text-sm font-semibold text-slate-200">
            {hasDocument ? 'Chat Session Active' : 'No Document Active'}
          </span>
        </div>
        {isGenerating && (
          <span className="text-xs text-brand-400 font-medium animate-pulse flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-ping"></span>
            AI is typing...
          </span>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-500 p-8 text-center">
            <Bot className="h-12 w-12 text-slate-600 mb-3" />
            <h4 className="text-sm font-semibold text-slate-400">Ask Document Anything</h4>
            <p className="max-w-xs text-xs text-slate-500 mt-1">
              {hasDocument
                ? 'Type your question below or click on one of the suggested questions to start.'
                : 'Please upload a PDF or PPT/PPTX document first to start chatting.'}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg text-white font-semibold text-sm shadow-sm
                  ${isUser ? 'bg-brand-600' : 'bg-slate-800 border border-slate-700'}
                `}>
                  {isUser ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5 text-brand-400" />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-2">
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                    ${isUser
                      ? 'bg-brand-600 text-white rounded-tr-none'
                      : 'bg-slate-900/60 text-slate-200 border border-slate-800/80 rounded-tl-none'}
                  `}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>

                  {/* Citation source pill */}
                  {!isUser && msg.source && msg.source !== 'N/A' && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1">
                      <span className="font-semibold text-slate-500">Source:</span>
                      <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 font-medium text-brand-400 border border-slate-800">
                        {msg.source}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Streaming Placeholder typing bubble */}
        {isGenerating && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-brand-400">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 flex items-center gap-1">
              <span className="dot h-2 w-2 rounded-full bg-brand-400"></span>
              <span className="dot h-2 w-2 rounded-full bg-brand-400"></span>
              <span className="dot h-2 w-2 rounded-full bg-brand-400"></span>
            </div>
          </div>
        )}

        {/* Anchor for scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating scroll down button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-8 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 hover:bg-brand-500 text-white shadow-lg border border-brand-400/20 transition-all hover:scale-105"
        >
          <ArrowDown className="h-4.5 w-4.5" />
        </button>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="border-t border-slate-800 bg-slate-950/40 p-4">
        <div className="relative flex items-center rounded-xl border border-slate-800 bg-slate-950/60 focus-within:border-brand-500 transition-all">
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
