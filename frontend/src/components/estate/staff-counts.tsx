import { STAFF_ROLES, totalStaff, type StaffCounts } from "@/lib/estate/staffing";

export function StaffCountsView({ counts }: { counts: StaffCounts }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
      {STAFF_ROLES.map((r) => (
        <div key={r.key} className="rounded-lg border border-border p-2.5"><dt className="eyebrow">{r.label}</dt><dd className="mt-0.5 text-lg font-light">{counts[r.key]}</dd></div>
      ))}
      <div className="col-span-2 rounded-lg bg-accent p-2.5 text-accent-foreground sm:col-span-4"><span className="font-medium">{totalStaff(counts)}</span> team members in total</div>
    </dl>
  );
}
