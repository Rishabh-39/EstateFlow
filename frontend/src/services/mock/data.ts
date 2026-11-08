/**
 * SIMULATED DATASET — prototype only.
 * Replace with NestJS + PostgreSQL responses via src/services/api/http.ts.
 */
import villaImg from "@/assets/room-villa.jpg";
import plantationImg from "@/assets/room-plantation.jpg";
import heroImg from "@/assets/hero-estate.jpg";
import lawnImg from "@/assets/event-lawn.jpg";
import type { DayCapacity, Enquiry, RatePlan, Room } from "@/lib/estate/types";

const plans: RatePlan[] = [
  { id: "flex", name: "Flexible — room only", description: "Free cancellation up to 7 days before arrival.", modifier: 1, refundable: true },
  { id: "breakfast", name: "Estate breakfast included", description: "Daily breakfast. Free cancellation up to 7 days before arrival.", modifier: 1.12, refundable: true },
  { id: "saver", name: "Advance saver", description: "Non-refundable. Pay now and save 10%.", modifier: 0.9, refundable: false },
];

export const ROOMS: Room[] = [
  {
    id: "plantation-room",
    name: "Plantation Room",
    category: "Room",
    maxGuests: 2,
    beds: "1 king or 2 twin",
    sizeSqft: 380,
    amenities: ["Plantation view", "Rain shower", "Wi-Fi", "Tea & coffee bar"],
    baseRate: 7200,
    image: plantationImg,
    gallery: [plantationImg, heroImg, villaImg],
    summary: "Shuttered doors that open onto rows of arabica and silver oak.",
    description:
      "Lime-washed walls, hand-woven rugs and teak shutters frame a quiet view of the coffee rows. Mornings begin with estate-roasted coffee on your verandah.",
    units: 40,
    ratePlans: plans,
  },
  {
    id: "valley-suite",
    name: "Valley Suite",
    category: "Room",
    maxGuests: 3,
    beds: "1 king + day bed",
    sizeSqft: 560,
    amenities: ["Valley view", "Soaking tub", "Private balcony", "Wi-Fi"],
    baseRate: 10400,
    image: heroImg,
    gallery: [heroImg, plantationImg, villaImg],
    summary: "A corner suite above the mist line with a deep soaking tub.",
    description:
      "Set on the upper terrace, the Valley Suite looks west across the Baba Budangiri range. A separate lounge and day bed suit a small family.",
    units: 24,
    ratePlans: plans,
  },
  {
    id: "pool-villa",
    name: "Hillside Pool Villa",
    category: "Villa",
    maxGuests: 4,
    beds: "2 king",
    sizeSqft: 1400,
    amenities: ["Private plunge pool", "Two bedrooms", "Outdoor deck", "Butler on call"],
    baseRate: 22500,
    image: villaImg,
    gallery: [villaImg, heroImg, lawnImg],
    summary: "Glass, stone and timber opening onto a private plunge pool.",
    description:
      "Floor-to-ceiling glass opens the villa to the forest canopy. Two bedrooms, a living pavilion and a private pool make it the estate's most secluded stay.",
    units: 8,
    ratePlans: plans,
  },
  {
    id: "planters-bungalow",
    name: "Planter's Bungalow",
    category: "Villa",
    maxGuests: 6,
    beds: "3 king",
    sizeSqft: 2100,
    amenities: ["Heritage architecture", "Three bedrooms", "Private garden", "Fireplace"],
    baseRate: 31000,
    image: lawnImg,
    gallery: [lawnImg, villaImg, plantationImg],
    summary: "A restored 1920s planter's home for families and small groups.",
    description:
      "Red-oxide floors, a working fireplace and a walled garden. The bungalow sleeps six and comes with a dedicated host for the length of your stay.",
    units: 4,
    ratePlans: plans,
  },
];

/** Dates (stay nights) on which a room type is sold out on the website allotment. */
export const SOLD_OUT: Record<string, string[]> = {
  "pool-villa": ["2026-12-24", "2026-12-25", "2026-12-26", "2026-12-31"],
  "planters-bungalow": ["2026-12-30", "2026-12-31", "2027-01-01"],
};

// ----- Event resource capacity (per night) -----

const DEFAULT_CAPACITY: DayCapacity = { roomsFree: 48, lawnFree: true, diningCovers: 320, parking: 82, eventStaff: 34 };

const CAPACITY_OVERRIDES: Record<string, Partial<DayCapacity>> = {
  "2026-12-05": { lawnFree: false },
  "2026-12-06": { lawnFree: false },
  "2026-12-10": { parking: 64 },
  "2026-12-11": { parking: 66 },
  "2026-12-12": { parking: 58 },
  "2026-12-13": { parking: 60 },
  "2026-12-14": { parking: 62 },
  "2026-12-15": { roomsFree: 28 },
  "2026-12-19": { lawnFree: false },
  "2026-12-20": { lawnFree: false },
  "2026-12-24": { roomsFree: 10 },
  "2026-12-25": { roomsFree: 6 },
  "2026-12-26": { roomsFree: 8, lawnFree: false },
  "2026-12-27": { roomsFree: 12, lawnFree: false },
  "2026-12-28": { roomsFree: 14 },
  "2026-12-29": { roomsFree: 9 },
  "2026-12-30": { roomsFree: 4 },
  "2026-12-31": { roomsFree: 2 },
};

export function capacityFor(iso: string): DayCapacity {
  return { ...DEFAULT_CAPACITY, ...CAPACITY_OVERRIDES[iso] };
}

/** Start dates where a concurrent booking lands between check and commit (simulated race). */
export const CONFLICT_ON_COMMIT = new Set(["2026-12-17"]);

export const STAFF = ["Meera Hegde", "Arjun Rao", "Kavya Shetty"];

export const ENQUIRIES: Enquiry[] = [
  {
    id: "ENQ-2041",
    from: "Ananya Kulkarni",
    email: "ananya.k@example.com",
    channel: "Email",
    receivedAt: "2026-11-04T07:42:00Z",
    subject: "Wedding in December — 250 guests",
    message:
      "Hello! Rohan and I are planning our wedding on 12–14 December. We expect around 250 guests and would need about 35 rooms for two nights, the lawn for the main ceremony, dinner for everyone and parking for roughly 70 cars. Could you let us know if this is possible?",
    category: "Wedding",
    confidence: 0.94,
    priority: "High",
    status: "New",
    assignee: "Meera Hegde",
    requirements: { startDate: "2026-12-12", nights: 2, guests: 250, rooms: 35, needsLawn: true, diningCovers: 250, parking: 70, eventStaff: 25 },
    draftReply:
      "Dear Ananya,\n\nCongratulations to you and Rohan! Thank you for considering our estate. Our reservations team is reviewing room, lawn, dining and parking availability for 12–14 December and will confirm options shortly.\n\nWarm regards,\nMeera Hegde, Reservations",
  },
  {
    id: "ENQ-2042",
    from: "Kairos Technologies",
    email: "people@kairos.example",
    channel: "Web form",
    receivedAt: "2026-11-04T05:10:00Z",
    subject: "Leadership offsite, Jan 2027",
    message:
      "We'd like to host a leadership offsite for 60 people from 15 to 17 January 2027. We need 30 rooms, a meeting space, all meals and parking for about 20 vehicles. No lawn required.",
    category: "Offsite",
    confidence: 0.91,
    priority: "Normal",
    status: "In review",
    assignee: "Arjun Rao",
    requirements: { startDate: "2027-01-15", nights: 2, guests: 60, rooms: 30, needsLawn: false, diningCovers: 60, parking: 20, eventStaff: 8 },
    draftReply:
      "Hello Kairos team,\n\nThank you for your enquiry. We're checking availability for 15–17 January and will share a proposal with room and meeting options.\n\nBest,\nArjun Rao",
  },
  {
    id: "ENQ-2043",
    from: "+91 98450 •• •• 12",
    email: "",
    channel: "WhatsApp",
    receivedAt: "2026-11-03T18:22:00Z",
    subject: "Something for my parents' anniversary",
    message: "hi can we do something for my parents anniversary next month? around 40 people maybe. lunch and few rooms",
    category: "Unsorted",
    confidence: 0.52,
    priority: "Normal",
    status: "New",
    assignee: "Kavya Shetty",
    requirements: { startDate: null, nights: 1, guests: 40, rooms: null, needsLawn: false, diningCovers: 40, parking: null, eventStaff: 5 },
    draftReply:
      "Hi! Thank you for reaching out — we'd love to help celebrate your parents' anniversary. Could you share the preferred date, how many rooms you need and whether guests will drive?",
  },
  {
    id: "ENQ-2044",
    from: "Daniel Fernandes",
    email: "dan.f@example.com",
    channel: "Email",
    receivedAt: "2026-11-03T11:05:00Z",
    subject: "Pool villa for New Year?",
    message: "Is the pool villa available from 30 Dec to 2 Jan for 2 adults?",
    category: "Room",
    confidence: 0.97,
    priority: "Normal",
    status: "Awaiting guest",
    assignee: "Meera Hegde",
    requirements: null,
    draftReply:
      "Dear Daniel,\n\nThank you for your interest. The Hillside Pool Villa is sold out on 31 December. We can offer the Planter's Bungalow or alternative dates — would either work?\n\nWarm regards,\nMeera",
  },
  {
    id: "ENQ-2045",
    from: "Priya Menon",
    email: "priya.m@example.com",
    channel: "Phone",
    receivedAt: "2026-11-02T16:40:00Z",
    subject: "Unhappy with room cleanliness",
    message: "Logged by front desk: guest in Valley Suite 214 reported the room was not cleaned on day two and requested a call back from management.",
    category: "Complaint",
    confidence: 0.88,
    priority: "High",
    status: "New",
    assignee: "Kavya Shetty",
    requirements: null,
    draftReply:
      "Dear Priya,\n\nWe're truly sorry about your experience. Our General Manager will call you today to make this right.\n\nSincerely,\nKavya Shetty",
  },
  {
    id: "ENQ-2046",
    from: "Vikram & Sneha",
    email: "vs.wedding@example.com",
    channel: "Web form",
    receivedAt: "2026-11-01T09:00:00Z",
    subject: "Grand wedding, 500 guests",
    message: "We are planning a wedding for 500 guests on 8–9 January 2027 with 60 rooms, lawn ceremony and dinner for all guests.",
    category: "Wedding",
    confidence: 0.93,
    priority: "Normal",
    status: "In review",
    assignee: "Arjun Rao",
    requirements: { startDate: "2027-01-08", nights: 1, guests: 500, rooms: 60, needsLawn: true, diningCovers: 500, parking: 140, eventStaff: 50 },
    draftReply:
      "Dear Vikram and Sneha,\n\nThank you for thinking of us for your celebration. We're reviewing our capacity for 500 guests and will be in touch shortly.\n\nWarm regards,\nArjun Rao",
  },
];
