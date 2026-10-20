import type { RiasecType } from "./types";
export const RIASEC_ORDER: RiasecType[] = ["R","I","A","S","E","C"];
export const RIASEC_INFO: Record<RiasecType,{label:string;name:string;desc:string}> = {
  R:{label:"Thực tế",name:"Thực tế (Realistic)",desc:"Thích làm việc tay chân, kỹ thuật."},
  I:{label:"Nghiên cứu",name:"Nghiên cứu (Investigative)",desc:"Thích tìm tòi, phân tích."},
  A:{label:"Nghệ thuật",name:"Nghệ thuật (Artistic)",desc:"Thích sáng tạo."},
  S:{label:"Xã hội",name:"Xã hội (Social)",desc:"Thích giúp đỡ, giảng dạy."},
  E:{label:"Lãnh đạo",name:"Lãnh đạo (Enterprising)",desc:"Thích kinh doanh, thuyết phục."},
  C:{label:"Nghiệp vụ",name:"Nghiệp vụ (Conventional)",desc:"Thích số liệu, quy trình."},
};
