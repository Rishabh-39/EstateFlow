import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chip = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        brand: "bg-accent text-accent-foreground",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-destructive",
        coffee: "bg-coffee/15 text-coffee",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function StatusChip({
  tone,
  dot,
  className,
  children,
}: VariantProps<typeof chip> & { dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn(chip({ tone }), className)}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
