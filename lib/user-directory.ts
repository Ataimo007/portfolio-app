import type { IdentityUser } from "./keycloak-admin";

export const userStatusFilters = [
  "all",
  "active",
  "pending",
  "disabled",
  "closed",
] as const;
export type UserStatusFilter = (typeof userStatusFilters)[number];
export type UserStatus = Exclude<UserStatusFilter, "all">;

export function userStatus(
  person: Pick<IdentityUser, "enabled" | "emailVerified">,
  profileStatus?: string,
): UserStatus {
  if (profileStatus === "closed") return "closed";
  if (
    !person.enabled ||
    profileStatus === "disabled" ||
    profileStatus === "deleted"
  )
    return "disabled";
  return person.emailVerified ? "active" : "pending";
}

export function userStatusLabel(status: UserStatus) {
  return status === "pending" ? "Pending verification" : status;
}

export async function filteredUserPage<T>(
  fetchBatch: (first: number, max: number) => Promise<T[]>,
  matches: (person: T) => boolean,
  first: number,
  size = 30,
) {
  const matchesPage: T[] = [];
  let offset = 0,
    matched = 0;
  while (matchesPage.length <= size) {
    const batch = await fetchBatch(offset, 100);
    for (const person of batch) {
      if (!matches(person)) continue;
      if (matched++ >= first) matchesPage.push(person);
      if (matchesPage.length > size) break;
    }
    if (batch.length < 100) break;
    offset += batch.length;
  }
  return {
    people: matchesPage.slice(0, size),
    hasMore: matchesPage.length > size,
  };
}
