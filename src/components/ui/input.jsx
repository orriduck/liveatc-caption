import { cn } from "@/lib/utils";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-w-0 border-0 bg-transparent outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-atc-dim disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
