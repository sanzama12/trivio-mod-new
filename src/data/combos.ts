import type { Combo, Subject } from "../domain/types";

export const subjects: Subject[] = [
  { id: "toan", name: "Toán", short: "Toán" },
  { id: "ly", name: "Vật lý", short: "Lý" },
  { id: "hoa", name: "Hóa học", short: "Hóa" },
  { id: "sinh", name: "Sinh học", short: "Sinh" },
  { id: "van", name: "Ngữ văn", short: "Văn" },
  { id: "su", name: "Lịch sử", short: "Sử" },
  { id: "dia", name: "Địa lý", short: "Địa" },
  { id: "anh", name: "Tiếng Anh", short: "Anh" },
  { id: "ve", name: "Vẽ mỹ thuật", short: "Vẽ" },
];

export const combos: Combo[] = [
  { code: "A00", subjects: ["toan", "ly", "hoa"] },
  { code: "A01", subjects: ["toan", "ly", "anh"] },
  { code: "B00", subjects: ["toan", "hoa", "sinh"] },
  { code: "C00", subjects: ["van", "su", "dia"] },
  { code: "D01", subjects: ["toan", "van", "anh"] },
  { code: "D07", subjects: ["toan", "hoa", "anh"] },
  { code: "V00", subjects: ["toan", "ly", "ve"] },
];
