/** UI metadata only. Protected calls are authorized by NestJS and DB-verified JWTs. */
import { getToken, setToken } from "@/services/api/http";
const KEY = "ef-staff";
export type StaffRole = "staff" | "gm";
export type StaffUser = { name:string;email:string;role:StaffRole };
export const getStaff=():StaffUser|null=>{if(typeof window==="undefined"||!getToken())return null;try{return JSON.parse(sessionStorage.getItem(KEY)||"null");}catch{return null;}};
export const setStaff=(u:StaffUser|null)=>{if(typeof window==="undefined")return;if(u)sessionStorage.setItem(KEY,JSON.stringify(u));else{sessionStorage.removeItem(KEY);setToken(null);}};
