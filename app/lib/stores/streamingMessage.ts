import { create } from "zustand";

type StreamingMessageStore = {
  streamingMessages: Record<string, string>;
  setStreamingMessage: (id: string, message: string) => void;
  deleteStreamingMessage: (id: string) => void;
};

export const streamingMessageStore = create<StreamingMessageStore>((set) => {
  return {
    streamingMessages: {},
    setStreamingMessage: (id, message) =>
      set((state) => ({
        streamingMessages: { ...state.streamingMessages, [id]: message },
      })),
    deleteStreamingMessage: (id) =>
      set((state) => {
        const { [id]: _, ...rest } = state.streamingMessages;
        return { streamingMessages: rest };
      }),
  };
});

export function useStreamingMessage(messageListId: string) {
  return streamingMessageStore(
    (state) => state.streamingMessages[messageListId]
  );
}
