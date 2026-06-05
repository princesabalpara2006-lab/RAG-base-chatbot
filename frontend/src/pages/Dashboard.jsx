import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import UploadArea from '../components/UploadArea';
import DocumentStatus from '../components/DocumentStatus';
import ChatWindow from '../components/ChatWindow';
import SuggestedQuestions from '../components/SuggestedQuestions';
import SummaryPanel from '../components/SummaryPanel';
import { askQuestionStream } from '../services/api';

export default function Dashboard() {
  const [documentId, setDocumentId] = useState('');
  const [filename, setFilename] = useState('');
  const [questions, setQuestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleUploadSuccess = (data) => {
    setDocumentId(data.document_id);
    setFilename(data.filename);
    setQuestions(data.questions || []);
    // Reset conversation on new document upload
    setMessages([]);
  };

  const handleSendMessage = async (text) => {
    if (!documentId || isGenerating) return;

    // 1. Add user message to history
    const userMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    // 2. Add empty bot message that will be updated in real-time
    const botMessageIndex = messages.length + 1; // index in the upcoming list
    setMessages((prev) => [...prev, { role: 'ai', text: '', source: '' }]);

    let accumulatedText = '';
    
    // 3. Initiate SSE Streaming
    await askQuestionStream(documentId, text, {
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
      onSource: (source) => {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[botMessageIndex]) {
            updated[botMessageIndex] = {
              ...updated[botMessageIndex],
              source: source,
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
      },
    });
  };

  const handleSelectQuestion = (question) => {
    handleSendMessage(question);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left panel: upload, status, questions, summary */}
          <div className="space-y-6 lg:col-span-5 flex flex-col justify-start">
            <div className="space-y-6">
              <UploadArea onUploadSuccess={handleUploadSuccess} />
              
              {documentId && (
                <DocumentStatus
                  documentInfo={{
                    filename,
                    documentId,
                  }}
                />
              )}

              <SuggestedQuestions
                questions={questions}
                onSelectQuestion={handleSelectQuestion}
                disabled={isGenerating || !documentId}
              />

              <SummaryPanel
                documentId={documentId}
                hasDocument={!!documentId}
              />
            </div>
          </div>

          {/* Right panel: chat interface */}
          <div className="lg:col-span-7">
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
              hasDocument={!!documentId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
