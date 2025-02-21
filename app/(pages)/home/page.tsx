"use client"

import PageHeader from '@/components/page-header';
import { SearchBar } from '@/components/search/search-bar'
import { SearchResults } from '@/components/search/search-results'
import { useSearchStore } from '@/store/search-store'

export default function HomePage() {
  const { isLoading } = useSearchStore();

  return (
    <div className='flex flex-col space-y-8'>
      <PageHeader />
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