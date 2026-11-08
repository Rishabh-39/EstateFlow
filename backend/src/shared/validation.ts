import { BadRequestException } from '@nestjs/common';
export function ensureDate(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`)) || new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)!==s) throw new BadRequestException('Expected a valid YYYY-MM-DD date');
  return s;
}
export function stayDates(start: string, end: string): string[] {
  ensureDate(start); ensureDate(end);
  const a=Date.parse(start+'T00:00:00Z'), b=Date.parse(end+'T00:00:00Z');
  const nights=(b-a)/86400000;
  if (!Number.isInteger(nights) || nights<1 || nights>30) throw new BadRequestException('Stay must be 1 to 30 nights with checkout after checkin');
  return Array.from({length:nights},(_,i)=>new Date(a+i*86400000).toISOString().slice(0,10));
}
export function positiveInt(n: unknown, label:string, max=10000): number {
  if (typeof n!=='number' || !Number.isInteger(n)|| n<1||n>max) throw new BadRequestException(`${label} must be an integer between 1 and ${max}`);
  return n;
}
export function nonnegativeInt(n: unknown,label:string,max=10000): number {
  if (typeof n!=='number'|| !Number.isInteger(n)||n<0||n>max) throw new BadRequestException(`${label} must be an integer between 0 and ${max}`);
  return n;
}
export function errorCode(error:unknown):string { return error instanceof Error ? error.message : 'UNKNOWN_ERROR'; }
