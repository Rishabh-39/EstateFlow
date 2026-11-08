/** Staff-reviewed fields. Null means unknown, 0 means explicitly not required. */
import type { EventRequirements } from "./types";
export const isDayEvent = (r: EventRequirements) => r.rooms === 0 && r.nights === 0;
export function reviewMissing(r: EventRequirements): string[] {
 const missing: string[] = [];
 if (!r.eventType || r.eventType === "Unspecified") missing.push("Choose event type");
 if (!r.venuePreference || r.venuePreference === "UNCONFIRMED") missing.push("Choose actual venue");
 if (!r.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(r.startDate) || Number.isNaN(Date.parse(r.startDate+"T00:00:00Z")) || new Date(r.startDate+"T00:00:00Z").toISOString().slice(0,10) !== r.startDate) missing.push("Confirm event date");
 if (r.guests === null || !Number.isInteger(r.guests) || r.guests < 1) missing.push("Confirm number of guests");
 if (r.rooms === null || !Number.isInteger(r.rooms) || r.rooms < 0) missing.push("Confirm rooms (0 if none)");
 if (r.nights === null || !Number.isInteger(r.nights) || (r.rooms === 0 ? r.nights !== 0 : r.nights < 1)) missing.push("Confirm stay nights (0 if no rooms)");
 if (r.diningCovers === null || !Number.isInteger(r.diningCovers) || r.diningCovers < 0) missing.push("Confirm catering covers (0 if none)");
 if (r.parking === null || !Number.isInteger(r.parking) || r.parking < 0) missing.push("Confirm parking (0 if none)");
 if (r.eventStaff === null || !Number.isInteger(r.eventStaff) || r.eventStaff < 1) missing.push("Confirm event staff");
 return missing;
}
export const canSubmitReview = (r: EventRequirements) => reviewMissing(r).length === 0;
