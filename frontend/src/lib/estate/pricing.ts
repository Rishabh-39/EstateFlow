import type { NightRate, Quote, Room } from "./types";

/** Illustrative promo codes for the prototype. Real codes come from Rates admin / backend. */
export const PROMO_CODES: Record<string, number> = {
  ESTATE10: 0.1,
  MONSOON15: 0.15,
};

/** Indian GST on hotel accommodation: 5% up to ₹7,500 per night, 18% above. */
export function gstRateFor(nightlyTariff: number): number {
  return nightlyTariff > 7500 ? 0.18 : 0.05;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cur = checkIn;
  while (cur < checkOut && out.length < 60) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function isWeekend(iso: string): boolean {
  const day = new Date(iso + "T00:00:00Z").getUTCDay();
  return day === 5 || day === 6; // Friday & Saturday nights
}

/** Nightly room rate: weekend nights carry a 15% premium. */
export function nightlyRate(room: Room, iso: string, modifier = 1): number {
  const base = room.baseRate * modifier;
  return Math.round(isWeekend(iso) ? base * 1.15 : base);
}

export function quote(
  room: Room,
  checkIn: string,
  checkOut: string,
  modifier = 1,
  promo?: string | null,
): Quote {
  const code = promo?.trim().toUpperCase() || null;
  const discountRate = code && PROMO_CODES[code] ? PROMO_CODES[code] : 0;
  let subtotal = 0;
  let discount = 0;
  let gst = 0;
  const nights: NightRate[] = nightsBetween(checkIn, checkOut).map((date) => {
    const rate = nightlyRate(room, date, modifier);
    const off = Math.round(rate * discountRate);
    const tariff = rate - off;
    const gstRate = gstRateFor(tariff);
    const nightGst = Math.round(tariff * gstRate);
    subtotal += rate;
    discount += off;
    gst += nightGst;
    return { date, rate, gstRate, gst: nightGst };
  });
  const taxable = subtotal - discount;
  return {
    nights,
    subtotal,
    discount,
    taxable,
    gst,
    total: taxable + gst,
    promoApplied: discountRate ? code : null,
  };
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
