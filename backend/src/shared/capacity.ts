/** Pure inventory arithmetic, separately testable without a database. */
export type NightlyWebsiteStock = {website_allotment:number;direct_used:string|number;blacked_out:boolean};
export function directAvailableUnits(physicalContinuousUnits:number,nights:NightlyWebsiteStock[]):number {
 if(!Number.isInteger(physicalContinuousUnits)||physicalContinuousUnits<0||nights.length===0)return 0;
 let remaining=physicalContinuousUnits;
 for(const day of nights){
  if(day.blacked_out)return 0;
  const used=Number(day.direct_used);
  if(!Number.isSafeInteger(used)||used<0||!Number.isSafeInteger(day.website_allotment)||day.website_allotment<0)return 0;
  remaining=Math.min(remaining,Math.max(0,day.website_allotment-used));
 }
 return remaining;
}
