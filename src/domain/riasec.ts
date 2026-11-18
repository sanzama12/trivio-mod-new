import type { RiasecResult, RiasecType } from "./types";
export const RIASEC_ORDER: RiasecType[] = ["R","I","A","S","E","C"];

/** Relative interest index weighted by the major's ordered RIASEC tags. */
export function matchMajor(result: Pick<RiasecResult, "percents"> | null | undefined, major: { riasec: RiasecType[] }): number {
  if (!result || !major.riasec.length) return 50;
  const types = [...new Set(major.riasec)].filter((type) => RIASEC_ORDER.includes(type)).slice(0, 3);
  if (!types.length) return 50;
  let total = 0;
  let weights = 0;
  types.forEach((type, index) => {
    const weight = 3 - index;
    total += result.percents[type] * weight;
    weights += weight;
  });
  return Math.round(total / weights);
}
export const RIASEC_INFO: Record<RiasecType,{label:string;name:string;desc:string}> = {
  R:{label:"Thực tế",name:"Thực tế (Realistic)",desc:"Thích làm việc tay chân, kỹ thuật."},
  I:{label:"Nghiên cứu",name:"Nghiên cứu (Investigative)",desc:"Thích tìm tòi, phân tích."},
  A:{label:"Nghệ thuật",name:"Nghệ thuật (Artistic)",desc:"Thích sáng tạo."},
  S:{label:"Xã hội",name:"Xã hội (Social)",desc:"Thích giúp đỡ, giảng dạy."},
  E:{label:"Lãnh đạo",name:"Lãnh đạo (Enterprising)",desc:"Thích kinh doanh, thuyết phục."},
  C:{label:"Nghiệp vụ",name:"Nghiệp vụ (Conventional)",desc:"Thích số liệu, quy trình."},
};
