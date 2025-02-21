"use client"

import PageHeader from '@/components/page-header';
import { SearchBar } from '@/components/search/search-bar'
import { SearchResults } from '@/components/search/search-results'
import { useSearchStore } from '@/store/search-store'
import { LoadingDots } from '@/components/search/loading-dots';

export default function HomePage() {
  const { isLoading } = useSearchStore();

  return (
    <div className='flex flex-col space-y-8'>
      <PageHeader />
      <SearchBar />

      {isLoading ? (
        <div className="flex justify-center">
          <LoadingDots />
        </div>
      ) : (
        <SearchResults />
      )}
    </div>
  )
} 