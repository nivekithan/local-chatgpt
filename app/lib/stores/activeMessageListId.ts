import { create } from "zustand";
import { NEW_CHAT_ID } from "../constants";

type ActiveListState = {
  activeListId: string;
  setActiveListId: (id: string) => void;
};

export const useActiveListId = create<ActiveListState>((set) => {
  return {
    activeListId: NEW_CHAT_ID,
    setActiveListId: (id) => {
      console.log("Setting new useActiveListId", id);
      return set({ activeListId: id });
    },
  };
});
