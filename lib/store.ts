import { create } from 'zustand';

export type TranscriptEntry = {
  timestamp: string;
  text: string;
};

export type SuggestionItem = {
  type: 'question' | 'talking' | 'answer' | 'fact';
  text: string;
};

export type SuggestionBatch = {
  batchId: number;
  createdAt: string;
  items: SuggestionItem[];
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type SessionState = {
  transcript: TranscriptEntry[];
  suggestions: SuggestionBatch[];
  chat: ChatMessage[];
  isRecording: boolean;
};

// Actions
export type SessionActions = {
  addTranscript: (entry: TranscriptEntry) => void;
  addSuggestions: (batch: SuggestionBatch) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearSession: () => void;
  setIsRecording: (val: boolean) => void;
};

export const useSessionStore = create<SessionState & SessionActions>((set) => ({
  transcript: [],
  suggestions: [],
  chat: [],
  isRecording: false,
  addTranscript: (entry) =>
    set((state) => ({
      transcript: [...state.transcript, entry],
    })),
  addSuggestions: (batch) =>
    set((state) => ({
      suggestions: [batch, ...state.suggestions].slice(0, 5), // Keep only last 5 batches
    })),
  addChatMessage: (message) =>
    set((state) => ({
      chat: [...state.chat, message],
    })),
  setIsRecording: (isRecording) => set({ isRecording }),
  clearSession: () =>
    set({
      transcript: [],
      suggestions: [],
      chat: [],
      isRecording: false,
    }),
}));