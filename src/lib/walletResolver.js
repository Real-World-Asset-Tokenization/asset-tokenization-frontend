// Authoritative wallet mapping for pre-seeded demonstration accounts ONLY
export const KNOWN_USER_WALLETS = {
  // Pre-seeded demo accounts strictly keyed by exact email
  "punsithdaniru@gmail.com": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "inv1@gmail.com": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "inv2@gmail.com": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
  "officer@gmail.com": "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
};

/**
 * Resolves the authoritative wallet address for a user.
 * 1. Checks user.walletAddress saved on the user's account record (authoritative).
 * 2. Checks exact email match for known pre-seeded demo accounts.
 * 3. Returns null for any newly registered or unlinked user (prompting them to 'Add Wallet').
 * Never assigns wallets based on generic role or fuzzy strings!
 */
export function resolveUserWallet(user) {
  if (!user) return null;

  // 1. Explicit walletAddress saved on user record (Highest priority)
  if (user.walletAddress && typeof user.walletAddress === "string" && user.walletAddress.startsWith("0x")) {
    return user.walletAddress.toLowerCase().trim();
  }

  // 2. Strict exact match for pre-seeded demonstration accounts ONLY by exact email
  const email = (user.email || "").toLowerCase().trim();
  if (email && KNOWN_USER_WALLETS[email]) {
    return KNOWN_USER_WALLETS[email].toLowerCase();
  }

  // 3. Any new or unlinked user account returns null (must add their own wallet)
  return null;
}
