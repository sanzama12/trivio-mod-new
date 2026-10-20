import type { RiasecResult, RiasecType } from "../domain/types";
export function matchMajor(r:any, m:{riasec:RiasecType[]}):number{
  if(!r) return 50;
  const code:string[] = r.code ?? [];
  let s=0; m.riasec.forEach((t,i)=>{ const idx=code.indexOf(t); if(idx>=0) s+= 3-idx + (3-i)*0.5; });
  return Math.max(0,Math.min(100,Math.round(40+s*8)));
}
export default matchMajor;
