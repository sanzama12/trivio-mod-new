/** Tiến độ theo chủ sở hữu trên thiết bị; share được kiểm tra trên server. */
export type JourneyFlag = "explored" | "suggestions";
export const journeyKey = (flag: JourneyFlag, userId: string | null) =>
  `trovio:journey:${userId ? `user:${userId}` : "guest"}:${flag}`;

export function mergeGuestJourney(userId: string) {
  try {
    for (const flag of ["explored", "suggestions"] as const) {
      const guest = journeyKey(flag, null);
      if (localStorage.getItem(guest) === "1") localStorage.setItem(journeyKey(flag, userId), "1");
      localStorage.removeItem(guest);
    }
  } catch { /* storage không khả dụng */ }
}
