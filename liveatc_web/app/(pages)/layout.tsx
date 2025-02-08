export default function PagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-5xl w-full space-y-8">
        {children}
      </div>
    </main>
  )
} 