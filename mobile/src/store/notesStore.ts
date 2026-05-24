/**
 * Kogniva — Notes Store (Zustand)
 *
 * Manages local UI state for notes:
 * - Selected category filter
 * - Search query filter
 * - View mode (grid/list)
 */
import { create } from 'zustand';

interface NotesState {
  selectedCategory: string | null;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  showPinnedOnly: boolean;

  setCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setShowPinnedOnly: (show: boolean) => void;
  resetFilters: () => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  selectedCategory: null,
  searchQuery: '',
  viewMode: 'grid',
  showPinnedOnly: false,

  setCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowPinnedOnly: (show) => set({ showPinnedOnly: show }),
  resetFilters: () => set({ selectedCategory: null, searchQuery: '', showPinnedOnly: false }),
}));
