import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function SuggestedQuestions({ questions, onSelectQuestion, disabled }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <HelpCircle className="h-3.5 w-3.5 text-brand-400" />
        <span>Suggested Questions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, idx) => (
          <button
            key={idx}
            onClick={() => !disabled && onSelectQuestion(question)}
            disabled={disabled}
            className="rounded-full border border-slate-800 bg-slate-900/30 px-3.5 py-1.5 text-xs text-slate-300 transition-all hover:border-brand-500/40 hover:bg-slate-900/60 disabled:opacity-40 disabled:hover:border-slate-800 disabled:hover:bg-slate-900/30 disabled:cursor-not-allowed text-left hover:scale-[1.01] active:scale-[0.99]"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
