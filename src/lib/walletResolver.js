/**
 * The wallet that belongs to a signed-in user: only the walletAddress saved on their
 * account in the database. There is no other fallback (no email or role mapping), so an
 * account without a saved wallet gets null and is asked to add one.
 */
export function resolveUserWallet(user) {
  const w = user?.walletAddress;
  if (typeof w === "string" && /^0x[a-fA-F0-9]{40}$/.test(w.trim())) {
    return w.toLowerCase().trim();
  }
  return null;
}

export const sameWallet = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());
