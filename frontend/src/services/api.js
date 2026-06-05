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
 * Generates a summary for the given document_id.
 */
export const getDocumentSummary = (documentId) => {
  return apiClient.post('/summary', { document_id: documentId });
};

/**
 * Queries the chatbot and streams the response token-by-token using Fetch API ReadableStream.
 */
export async function askQuestionStream(documentId, question, { onToken, onSource, onError, onDone }) {
  try {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document_id: documentId,
        question: question
      })
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
            onSource(data.source);
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
          if (data.source) onSource(data.source);
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
