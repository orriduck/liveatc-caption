import { create } from 'zustand';
import { toast } from 'sonner';
import type { Airport, AudioChannel } from '@/types/airport';

interface SearchState {
  searchQuery: string;
  results: Airport[];
  isLoading: boolean;
  error: string | null;
  focusChannel: AudioChannel | null;
  setSearchQuery: (query: string) => void;
  searchAirports: (query: string) => Promise<void>;
  setFocusChannel: (channel: AudioChannel | null) => void;
}

const URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_LIVEATC_URL}`
  : "http://localhost:8000";

export const useSearchStore = create<SearchState>((set) => ({
  searchQuery: '',
  results: [],
  isLoading: false,
  error: null,
  focusChannel: null,
  setFocusChannel: (channel) => set({ focusChannel: channel }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchAirports: async (query) => {
    set({ isLoading: true, error: null });
    
    try {
      const searchPromise = async () => {
        try {
          // First try GET request
          const searchResponse = await fetch(`${URL}/airport/${query.toUpperCase()}`);
          
          if (!searchResponse.ok) {
            if (searchResponse.status === 404) {
              // Try POST request to update airport data
              const updateResponse = await fetch(`${URL}/airport/${query.toUpperCase()}`, {
                method: 'POST',
              });
              
              if (!updateResponse.ok) {
                throw new Error('Airport not found on LiveATC');
              }

              const airportStr = await updateResponse.text();
              const airports = JSON.parse(airportStr);
              set({ results: [airports], isLoading: false });
              return 'Airport data acquired successfully';
            }
            throw new Error(`Failed to fetch airport data: ${searchResponse.statusText}`);
          }

          const airportStr = await searchResponse.text();
          const airports = JSON.parse(airportStr);
          set({ results: [airports], isLoading: false });
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
          console.error('Search error:', error);
          return message;
        }
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false, results: [] });
      toast.error(`Error during airport search: ${message}`);
      console.error('Uncaught search error:', error);
    }
  },
}));