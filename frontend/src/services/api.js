import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Uploads a document (PDF/PPT/PPTX) and tracks progress via axios onUploadProgress.
 */
export const uploadDocument = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

/**
 * Deletes a document and its associated FAISS vectorstore.
 */
export const deleteDocument = (documentId) => {
  return apiClient.delete(`/documents/${documentId}`);
};

/**
 * Fetch all uploaded documents.
 */
export const getDocuments = () => {
  return apiClient.get('/documents');
};

/**
 * Generates a summary for the given document_id.
 */
export const getDocumentSummary = (documentId) => {
  return apiClient.post('/summary', { document_id: documentId });
};

/**
 * Fetch all conversations in history.
 */
export const getConversations = () => {
  return apiClient.get('/conversations');
};

/**
 * Creates a new conversation.
 */
export const createConversation = (documentId, title = 'New Conversation') => {
  return apiClient.post('/conversations', { document_id: documentId, title });
};

/**
 * Fetch details of a single conversation (including messages).
 */
export const getConversationDetails = (conversationId) => {
  return apiClient.get(`/conversations/${conversationId}`);
};

/**
 * Renames a conversation.
 */
export const renameConversation = (conversationId, title) => {
  return apiClient.put(`/conversations/${conversationId}/rename`, { title });
};

/**
 * Deletes a conversation.
 */
export const deleteConversation = (conversationId) => {
  return apiClient.delete(`/conversations/${conversationId}`);
};

/**
 * Sends message feedback (like, dislike, or null).
 */
export const sendFeedback = (conversationId, messageIndex, feedback) => {
  return apiClient.post(`/conversations/${conversationId}/feedback`, {
    message_index: messageIndex,
    feedback,
  });
};

/**
 * Toggles message bookmark status.
 */
export const toggleBookmark = (conversationId, messageIndex, bookmarked) => {
  return apiClient.post(`/conversations/${conversationId}/bookmark`, {
    message_index: messageIndex,
    bookmarked,
  });
};

/**
 * Fetch application stats.
 */
export const getStats = () => {
  return apiClient.get('/stats');
};

/**
 * Fetch active settings.
 */
export const getSettings = () => {
  return apiClient.get('/settings');
};

/**
 * Updates settings (provider, model, threshold, system_prompt, api_keys).
 */
export const updateSettings = (settings) => {
  return apiClient.post('/settings', settings);
};

/**
 * Queries the chatbot and streams the response token-by-token using Fetch API ReadableStream.
 */
export async function askQuestionStream(documentId, question, { conversationId, onToken, onSource, onError, onDone }) {
  try {
    const payload = {
      document_id: documentId,
      question: question
    };
    if (conversationId) {
      payload.conversation_id = conversationId;
    }

    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = "Something went wrong. Please try again.";
      try {
        parsedErr = JSON.parse(errText).detail || parsedErr;
      } catch (e) {
        parsedErr = errText || parsedErr;
      }
      throw new Error(parsedErr);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        const cleaned = line.trim();
        if (!cleaned || !cleaned.startsWith("data: ")) continue;
        
        try {
          const data = JSON.parse(cleaned.substring(6));
          if (data.token) {
            onToken(data.token);
          }
          if (data.source) {
            // Callback for standard page string source
            onSource(data.source, null, 0);
          }
          if (data.chunks) {
            // Callback with rich chunks and confidence score
            onSource(null, data.chunks, data.confidence);
          }
          if (data.done && onDone) {
            onDone();
          }
        } catch (e) {
          console.error("Error parsing SSE JSON payload", cleaned, e);
        }
      }
    }
    
    // Process remaining trailing data
    if (buffer) {
      const cleaned = buffer.trim();
      if (cleaned && cleaned.startsWith("data: ")) {
        try {
          const data = JSON.parse(cleaned.substring(6));
          if (data.token) onToken(data.token);
          if (data.source) onSource(data.source, null, 0);
          if (data.chunks) onSource(null, data.chunks, data.confidence);
          if (data.done && onDone) onDone();
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (err) {
    if (onError) {
      onError(err);
    }
  }
}
