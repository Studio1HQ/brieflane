import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status?: 'pending' | 'success' | 'error';
  optimisticState?: string;
};

interface ChatState {
  isOpen: boolean;
  messages: Message[];
  toggleChat: () => void;
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [],
      toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
      addMessage: (msg: Message) =>
        set((state) => ({ messages: [...state.messages, msg] })),
      updateMessage: (id: string, updates: Partial<Message>) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),
      clearChat: () => set({ messages: [] }),
    }),
    {
      name: 'meeting-ops-chat',
    }
  )
);
