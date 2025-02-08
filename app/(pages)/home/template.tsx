export default function HomeTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="animate-in fade-in duration-500">
      {children}
    </div>
  )
} 