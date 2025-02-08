"use client"

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/store/search-store';

export function SearchBar() {
  const { searchQuery, isLoading, setSearchQuery, searchAirports } = useSearchStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 3) {
      await searchAirports(searchQuery);
    }
  };

  return (
    <div className="w-full mx-auto">
      <form onSubmit={handleSearch} className="w-full">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Search airport (ICAO/IATA)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 w-full"
            disabled={isLoading}
          />
          <Button type="submit" disabled={searchQuery.length < 3 || isLoading}>
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </form>
    </div>
  );
} 