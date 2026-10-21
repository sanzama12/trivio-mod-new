/** Only two application roles. Legacy profile roles never grant privileges. */
export type AccountRole = "user" | "admin";
export function accountRole(admin: boolean | undefined): AccountRole {
  return admin === true ? "admin" : "user";
}

/** Reviewing and answering are ordinary user actions, not separate roles. */
export function canContribute(user: { verified: boolean; locked: boolean; disabled?: boolean } | null): boolean {
  return !!user && user.verified && !user.locked && !user.disabled;
}
