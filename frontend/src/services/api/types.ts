import type {
  Alternative,
  Enquiry,
  EnquiryCategory,
  EventRequirements,
  FeasibilityResult,
  Quote,
  Room,
} from "@/lib/estate/types";
import type { AllocationStatus, StaffAllocation, StaffCounts } from "@/lib/estate/staffing";

export interface AvailabilityResult {
  roomId: string;
  available: boolean;
  soldOutNights: string[];
}

export type PaymentOutcome = "success" | "declined" | "network";

export interface BookingInput {
  roomId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  promo: string | null;
  guest: { name: string; email: string; phone: string; requests: string };
  expectedTotal: number;
}

export interface Booking {
  reference: string;
  id?: string;
  status?: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  quote: Quote;
  createdAt: string;
}

export interface EventEnquiryInput {
  type: "Wedding" | "Corporate offsite" | "Other events";
  eventName?: string;
  customEventName?: string;
  eventDescription?: string;
  startDate: string;
  endDate: string;
  guests: number;
  rooms: number;
  venue: string;
  dining: string;
  parking: number;
  notes: string;
  name: string;
  email: string;
  phone: string;
}

export interface DayRate {
  date: string;
  roomId: string;
  /** null means this date has no verified price in PostgreSQL. */
  rate: number | null;
  allotment: number;
  blackout: boolean;
  gstBasisPoints?: number;
}

export interface Promo {
  code: string;
  discount: number;
  active: boolean;
  roomTypeId: string | null; // null means both accommodation categories
}

export type ApproveResult =
  | { status: "committed"; holdReference: string }
  | { status: "pending"; message: string }
  | { status: "conflict"; message: string };

/** Contract shared by the mock implementation and the future NestJS client. */
export interface EstateApi {
  listRooms(): Promise<Room[]>;
  getRoom(id: string): Promise<Room | null>;
  checkAvailability(roomId: string, checkIn: string, checkOut: string): Promise<AvailabilityResult>;
  createBooking(input: BookingInput, payment: PaymentOutcome): Promise<Booking>;
  getBooking(ref: string): Promise<Booking | null>;
  listBookings(): Promise<Booking[]>;
  submitEventEnquiry(input: EventEnquiryInput): Promise<{ reference: string }>;

  signIn(email: string, password: string, role?: "staff" | "gm"): Promise<{ name: string; email: string; role: "staff" | "gm" }>;
  getAllocation(enquiryId: string): Promise<StaffAllocation>;
  listAllocations(): Promise<StaffAllocation[]>;
  saveAllocation(enquiryId: string, counts: StaffCounts, notes: string): Promise<StaffAllocation>;
  moveAllocation(enquiryId: string, to: AllocationStatus, by: "staff" | "gm", gmNote?: string): Promise<StaffAllocation>;
  listEnquiries(): Promise<Enquiry[]>;
  getEnquiry(id: string): Promise<Enquiry | null>;
  updateEnquiry(id: string, patch: Partial<Pick<Enquiry, "category" | "status" | "assignee" | "draftReply" | "requirements">>): Promise<Enquiry>;
  saveDraftReply(id: string, body: string): Promise<{ savedAt: string }>;
  evaluateFeasibility(req: EventRequirements): Promise<{ result: FeasibilityResult; alternatives: Alternative[] }>;
  approveReservation(enquiryId: string, req: EventRequirements): Promise<ApproveResult>;

  listRates(from: string, days: number): Promise<DayRate[]>;
  saveRates(rates: DayRate[]): Promise<void>;
  listPromos(): Promise<Promo[]>;
  savePromos(promos: Promo[]): Promise<void>;
}

export type { EnquiryCategory };
