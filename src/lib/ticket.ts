import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * A visit ticket: the visit id, its one-time code and expiry, signed by the
 * server. Every frame upload and the final verdict check the signature, so the
 * visit needs no database row and the phone can't change its own code.
 */

export type Ticket = {
  visitId: string;
  code: string;
  projectId: string;
  milestoneId: string;
  issuedAt: number;
  expiresAt: number;
};

export const CODE_TTL_MS = 30 * 60 * 1000;
/** Frames may arrive a while after the code expires (slow networks), not forever. */
export const UPLOAD_GRACE_MS = 60 * 60 * 1000;

function secret(): string {
  const s = process.env.VISIT_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("VISIT_SECRET is not set");
  return "dev-only-visit-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueTicket(projectId: string, milestoneId: string): { ticket: string; data: Ticket } {
  const now = Date.now();
  const data: Ticket = {
    visitId: `vis_${randomBytes(6).toString("hex")}`,
    code: visitCode(),
    projectId,
    milestoneId,
    issuedAt: now,
    expiresAt: now + CODE_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return { ticket: `${payload}.${sign(payload)}`, data };
}

export function readTicket(ticket: string | null, visitId: string): Ticket | null {
  if (!ticket) return null;
  const [payload, sig] = ticket.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as Ticket;
    return data.visitId === visitId ? data : null;
  } catch {
    return null;
  }
}

/** Four characters with no look-alikes (0/O/Q, 1/I/L), easy to chalk on a block. */
function visitCode(): string {
  const alphabet = "ACDEFGHJKMNPRTUVWXY34679";
  return Array.from(randomBytes(4), (b) => alphabet[b % alphabet.length]).join("");
}
