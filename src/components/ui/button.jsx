import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium outline-none transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-md bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        ghost:
          "rounded-md text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
        outline:
          "rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
        atcChip:
          "rounded-full border border-atc-line-strong/80 bg-atc-card/70 px-3 font-sans text-atc-dim hover:border-atc-orange/45 hover:text-atc-text",
        atcRow:
          "justify-start rounded-[var(--atc-radius-panel)] border border-atc-line-strong/80 bg-atc-card/60 text-left font-sans text-atc-text hover:-translate-y-px hover:border-atc-orange/40 hover:bg-atc-card/75",
        atcIcon:
          "rounded-[var(--atc-radius-control)] border border-transparent bg-transparent text-atc-faint hover:border-atc-line-strong hover:bg-atc-line/60 hover:text-atc-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-atc-orange/55",
      },
      size: {
        default: "h-9 px-4 py-2 text-sm",
        sm: "h-8 px-3 text-sm",
        icon: "h-9 w-9 p-0 [&_svg:not([class*='size-'])]:size-4",
        auto: "h-auto min-h-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
