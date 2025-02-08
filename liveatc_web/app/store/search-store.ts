import { create } from 'zustand';
import { toast } from 'sonner';
import type { Airport } from '@/types/airport';

interface SearchState {
  searchQuery: string;
  results: Airport[];
  isLoading: boolean;
  error: string | null;
  setSearchQuery: (query: string) => void;
  searchAirports: (query: string) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchQuery: '',
  results: [],
  isLoading: false,
  error: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchAirports: async (query) => {
    set({ isLoading: true, error: null });
    
    try {
      const searchPromise = async () => {
        try {
          // First try GET request
          const searchResponse = await fetch(`/api/airport/${query.toUpperCase()}`);
          
          if (!searchResponse.ok) {
            if (searchResponse.status === 404) {
              // Try POST request to update airport data
              const updateResponse = await fetch(`/api/airport/${query.toUpperCase()}`, {
                method: 'POST',
              });
              
              if (!updateResponse.ok) {
                throw new Error('Airport not found on LiveATC');
              }
              
              const airport = await updateResponse.json();
              set({ results: [airport], isLoading: false });
              return 'Airport data acquired successfully';
            }
            throw new Error(`Failed to fetch airport data: ${searchResponse.statusText}`);
          }

          const data = await searchResponse.json();
          set({ results: [data], isLoading: false });
          return 'Found airport information';
        } catch (error) {
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            throw new Error('Unable to connect to the server. Please check your connection.');
          }
          throw error;
        }
      };

      toast.promise(searchPromise(), {
        loading: 'Searching for airport...',
        success: (message) => message,
        error: (error: Error) => {
          const message = error.message;
          set({ error: message, isLoading: false, results: [] });
          return message;
        }
      });

    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, isLoading: false, results: [] });
      toast.error(message);
    }
  },
})); 