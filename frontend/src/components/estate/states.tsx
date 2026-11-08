import { AlertTriangle, Inbox, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ErrorState({ title = "We couldn't reach the estate", body = "Check your connection and try again.", onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="panel flex flex-col items-center gap-3 p-10 text-center">
      <WifiOff className="size-6 text-muted-foreground" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {onRetry && <Button variant="quiet" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-3 p-10 text-center">
      <Inbox className="size-6 text-muted-foreground" />
      <h3 className="text-lg font-medium">{title}</h3>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}

export function Notice({ tone = "warning", title, children }: { tone?: "warning" | "danger" | "success" | "info"; title: string; children?: React.ReactNode }) {
  const map = {
    warning: "bg-warning-soft text-warning border-warning/25",
    danger: "bg-danger-soft text-destructive border-destructive/25",
    success: "bg-success-soft text-success border-success/25",
    info: "bg-accent text-accent-foreground border-primary/15",
  } as const;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex gap-3 rounded-xl border p-4 text-sm ${map[tone]}`}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
    </div>
  );
}

export function CardSkeletons({ n = 3 }: { n?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
