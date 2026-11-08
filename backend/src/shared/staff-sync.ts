/** Keep role-level *proposals* aligned to the event's reviewed aggregate staff request.
 * This is NOT a shift rostering or confirmed employee allocation. */
export const STAFF_KEYS=['reception','waiters','chefs','decor','roomService','laundry','valet','assistant'] as const;
export function alignStaffCounts(input:Record<string,number>,wanted:number):Record<string,number>{
 if(!Number.isSafeInteger(wanted)||wanted<0||wanted>140)throw new Error('Invalid requested event staff (0..140)');
 const base=STAFF_KEYS.map(k=>Math.max(0,Number(input[k])||0));
 if(wanted===0)return Object.fromEntries(STAFF_KEYS.map(k=>[k,0]));
 if(base.reduce((sum,n)=>sum+n,0)===0)base[0]=1;
 const denom=base.reduce((a,b)=>a+b,0);
 const weighted=base.map(n=>n*wanted/denom),out=weighted.map(Math.floor);
 let remaining=wanted-out.reduce((a,b)=>a+b,0);
 const priority=weighted.map((n,i)=>({i,rem:n-out[i]})).sort((a,b)=>b.rem-a.rem||a.i-b.i);
 for(let n=0;n<remaining;n++)out[priority[n].i]++;
 return Object.fromEntries(STAFF_KEYS.map((k,i)=>[k,out[i]]));
}
