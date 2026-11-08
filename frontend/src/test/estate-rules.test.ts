import { describe, expect, it } from "vitest";
import { evaluate, findAlternatives } from "@/lib/estate/feasibility";
import { gstRateFor, quote } from "@/lib/estate/pricing";
import { ENQUIRIES, ROOMS, capacityFor } from "@/services/mock/data";

describe("pricing", () => {
  it("applies 5% GST up to ₹7,500 and 18% above", () => {
    expect(gstRateFor(7500)).toBe(0.05);
    expect(gstRateFor(7501)).toBe(0.18);
  });
  it("ESTATE10 takes 10% off a weekday night before GST", () => {
    const room = ROOMS.find((r) => r.id === "plantation-room")!; // 7200
    const q = quote(room, "2026-12-01", "2026-12-02", 1, "estate10"); // Tuesday
    expect(q.discount).toBe(720);
    expect(q.gst).toBe(324);
    expect(q.total).toBe(6804);
  });
});

describe("feasibility", () => {
  const wedding = ENQUIRIES.find((e) => e.id === "ENQ-2041")!.requirements!;
  it("flags parking short by 12 spaces for the Dec 12 wedding", () => {
    const r = evaluate(wedding, capacityFor);
    expect(r.verdict).toBe("NOT_FEASIBLE");
    expect(r.bottlenecks).toContain("Parking capacity is insufficient by 12 spaces.");
  });
  it("only suggests alternatives the engine verifies as feasible", () => {
    const alts = findAlternatives(wedding, capacityFor);
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) expect(evaluate({ ...wedding, startDate: a.startDate }, capacityFor).verdict).toBe("FEASIBLE");
  });
  it("needs review when the date is missing", () => {
    expect(evaluate(ENQUIRIES.find((e) => e.id === "ENQ-2043")!.requirements!, capacityFor).verdict).toBe("NEEDS_REVIEW");
  });
  it("500-guest wedding has no verified alternatives", () => {
    expect(findAlternatives(ENQUIRIES.find((e) => e.id === "ENQ-2046")!.requirements!, capacityFor)).toEqual([]);
  });
});

import { canMove } from "@/lib/estate/staffing";
describe("staff allocation approval", () => {
  it("only the GM can approve a plan pending approval", () => {
    expect(canMove("Pending GM", "Approved", "gm")).toBe(true);
    expect(canMove("Pending GM", "Approved", "staff")).toBe(false);
  });
  it("a plan cannot be sent to the client before GM approval", () => {
    expect(canMove("Draft", "Sent to client", "staff")).toBe(false);
    expect(canMove("Pending GM", "Sent to client", "staff")).toBe(false);
    expect(canMove("Approved", "Sent to client", "staff")).toBe(true);
  });
});
