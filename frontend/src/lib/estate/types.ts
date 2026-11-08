export type RoomCategory = "Room" | "Villa";

export interface RatePlan {
  id: string;
  name: string;
  description: string;
  /** Multiplier applied to the nightly room rate. */
  modifier: number;
  refundable: boolean;
}

export interface Room {
  id: string;
  name: string;
  category: RoomCategory;
  maxGuests: number;
  beds: string;
  sizeSqft: number;
  amenities: string[];
  baseRate: number;
  image: string;
  gallery: string[];
  summary: string;
  description: string;
  units: number;
  ratePlans: RatePlan[];
}

export interface NightRate {
  date: string;
  rate: number;
  gstRate: number;
  gst: number;
}

export interface Quote {
  nights: NightRate[];
  subtotal: number;
  discount: number;
  taxable: number;
  gst: number;
  total: number;
  promoApplied: string | null;
}

export type ResourceKey = "rooms" | "lawn" | "dining" | "parking" | "staff";

export interface EventRequirements {
  /** Guest's chosen or AI-extracted venue. Non-lawn options are NOT reservable until configured. */
  venuePreference?: "LAWN" | "CONFERENCE_HALL" | "PLANTATION_PAVILION" | "UNCONFIRMED";
  /** Display-only event kind, not a substitute for a reviewed backend classification. */
  eventType?: "Wedding" | "Corporate offsite" | "Celebration" | "Unspecified";
  startDate: string | null;
  nights: number | null;
  guests: number | null;
  rooms: number | null;
  needsLawn: boolean;
  diningCovers: number | null;
  parking: number | null;
  eventStaff: number | null;
}

export interface DayCapacity {
  roomsFree: number;
  lawnFree: boolean;
  diningCovers: number;
  parking: number;
  eventStaff: number;
}

export type Verdict = "FEASIBLE" | "NOT_FEASIBLE" | "NEEDS_REVIEW";

export interface ResourceCheck {
  key: ResourceKey;
  label: string;
  unit: string;
  required: number;
  available: number;
  ok: boolean;
}

export interface FeasibilityResult {
  verdict: Verdict;
  resources: ResourceCheck[];
  bottlenecks: string[];
  missing: string[];
}

export interface Alternative {
  id: string;
  startDate: string;
  endDate: string;
  changes: string;
  result: FeasibilityResult;
}

export type EnquiryCategory = "Room" | "Wedding" | "Offsite" | "Other events" | "Complaint" | "Unsorted";
export type EnquiryStatus = "New" | "In review" | "Awaiting guest" | "Escalated" | "Pending GM" | "Approved" | "Client confirmed";
export type Channel = "Email" | "WhatsApp" | "Web form" | "Phone";

export interface Enquiry {
  id: string;
  from: string;
  email: string;
  phone?: string;
  channel: Channel;
  receivedAt: string;
  subject: string;
  message: string;
  category: EnquiryCategory;
  confidence: number;
  priority: "High" | "Normal" | "Low";
  status: EnquiryStatus;
  assignee: string;
  requirements: EventRequirements | null;
  draftReply: string;
  /** Derived by the backend; uncertain AI fields require confirmation before operational use. */
  aiReviewNotes?: string[];
  draftStatus?: "DRAFT" | "SENT_SIMULATED";
  gmReview?: {id:string;decision:"RESOLUTION_APPROVED"|"ACTION_REQUIRED";note:string;decidedAt:string;acknowledgedAt:string|null}|null;
}
