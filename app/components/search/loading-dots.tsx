export function LoadingDots() {
  return (
    <div className="flex flex-col items-center gap-2 mt-16">
      <div className="flex items-center gap-2">
        <div className="size-2 rounded bg-green-500 status-runway-1"></div>
        <div className="size-2 rounded bg-green-500 status-runway-2"></div>
        <div className="size-2 rounded bg-green-500 status-runway-3"></div>
      </div>
      <span>Loading...</span>
    </div>
  );
} 