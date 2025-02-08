"use client"

import { SearchBar } from '@/components/search/search-bar'
import { SearchResults } from '@/components/search/search-results'
import { useSearchStore } from '@/store/search-store'

export default function HomePage() {
  const { isLoading } = useSearchStore();

  return (
    <div className="flex flex-col space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          LiveATC Caption
        </h1>
        <p className="text-lg text-muted-foreground">
          Search and listen to air traffic control communications with real-time captions
        </p>
      </div>
      
      <SearchBar />

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <SearchResults />
      )}
    </div>
  )
} 