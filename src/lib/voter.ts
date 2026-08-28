// Anonymous voter identity (§9). Server-only: this module reaches for
// `astro:env/server` and `node:crypto`, and importing it from a component
// would leak both into the client bundle.
import { IP_SALT, VOTE_SECRET } from 'astro:env/server';
import { createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';

/** The signed cookie that identifies a browser. */
export const VOTER_COOKIE = 'pu_vid';

/** A year. Long enough that a returning reader keeps their verdicts; short
 *  enough that an abandoned identity eventually stops being retrievable. */
export const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie attributes. `httpOnly` because the client never needs to read this —
 *  the poll remembers its own choice in `localStorage` as a UI hint, and this
 *  value is server-side truth for deduplication only. `lax` because votes are
 *  same-site POSTs and `strict` would drop the cookie for anyone arriving from
 *  a shared link. */
export const VOTER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: import.meta.env.PROD,
  path: '/',
  maxAge: VOTER_COOKIE_MAX_AGE,
} as const;

/** Falls back to a fixed string when `VOTE_SECRET` is unset. That only happens
 *  in the no-database configuration, where nothing is ever written — an
 *  unsigned-in-effect cookie there identifies rows that do not exist. */
const secret = () => VOTE_SECRET ?? 'productunhunt-dev-secret';

const sign = (id: string) => createHmac('sha256', secret()).update(id).digest('base64url');

/** `<uuid>.<hmac>`. The id is readable, which is fine — it is a random opaque
 *  token — and the signature is what stops a caller minting a thousand of
 *  them to vote a thousand times. */
export function mintVoterId(): string {
  const id = randomUUID();
  return `${id}.${sign(id)}`;
}

/** The id half of a valid cookie, or `undefined` if it is missing, malformed,
 *  or signed with a different secret (a rotated `VOTE_SECRET` invalidates
 *  every outstanding cookie — old rows stay, they just orphan). */
export function verifyVoterId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return undefined;

  const id = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sign(id));
  // Constant-time, and length-checked first because `timingSafeEqual` throws
  // on a length mismatch rather than returning false.
  if (provided.length !== expected.length) return undefined;
  return timingSafeEqual(provided, expected) ? value : undefined;
}

/**
 * `sha256(IP_SALT + ip)`. §9 forbids storing the raw address, and the salt is
 * what stops the stored digest from being a rainbow-table lookup of the IPv4
 * space — an unsalted sha256 of an IP is trivially reversible.
 */
export function hashIp(ip: string): string {
  return createHash('sha256')
    .update(`${IP_SALT ?? 'productunhunt-dev-salt'}:${ip}`)
    .digest('hex');
}

/**
 * The client address, Netlify first. `x-nf-client-connection-ip` is set by the
 * edge and cannot be spoofed by the caller; `x-forwarded-for` can be, so it is
 * only a local-development fallback and its first hop is all that is read.
 */
export function clientIp(headers: Headers): string {
  const netlify = headers.get('x-nf-client-connection-ip');
  if (netlify) return netlify;
  const forwarded = headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}
