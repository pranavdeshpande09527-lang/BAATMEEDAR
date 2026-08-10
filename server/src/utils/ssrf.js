/**
 * Baatmeedar — Centralized SSRF Protection Utility
 *
 * Enforces strict security bounds on all outbound URL retrievals:
 * - Scheme must be HTTPS
 * - Rejects loopback, private IPv4/IPv6 ranges, link-local, AWS IMDS
 * - Rejects internal domain suffixes (.local, .internal, .lan, etc.)
 * - Rejects non-standard IP notations (hex, octal, single-integer IPs)
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '127.0.0.1',
  '::',
  '::1',
  '[::]',
  '[::1]',
]);

const BLOCKED_DOMAIN_SUFFIXES = [
  '.local',
  '.internal',
  '.lan',
  '.localhost',
  '.home.arpa',
];

/* IPv4 Private / Reserved Ranges:
   - 0.0.0.0/8       (Current network / Zero-net)
   - 10.0.0.0/8      (Private A)
   - 127.0.0.0/8     (Loopback)
   - 169.254.0.0/16  (Link-local / AWS IMDS)
   - 172.16.0.0/12   (Private B: 172.16.x.x - 172.31.x.x)
   - 192.168.0.0/16  (Private C)
*/
const IPV4_BLOCKED_PATTERNS = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
];

/* IPv6 Blocked Ranges:
   - fe80::/10 (Link-local)
   - fc00::/7, fd00::/7 (Unique local)
*/
const IPV6_BLOCKED_PATTERNS = [
  /^fe[89ab]/i,
  /^f[cd]/i,
];

/* Pure numeric integer or hex IP hostnames (e.g. 2130706433, 0x7f000001) */
const NUMERIC_IP_PATTERN = /^(0x[0-9a-f]+|\d+)$/i;

/**
 * Checks whether a given URL string is a safe, public HTTPS URL suitable for retrieval.
 * @param {string} str
 * @returns {boolean}
 */
export function isSafeHttpsUrl(str) {
  if (!str || typeof str !== 'string') return false;

  try {
    const url = new URL(str.trim());

    // 1. Protocol must be HTTPS strictly
    if (url.protocol !== 'https:') return false;

    // 2. Extract normalized hostname
    let hostname = url.hostname.toLowerCase();

    // Strip brackets if IPv6
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    // 3. Check exact blocked hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) return false;

    // 4. Check internal domain suffixes
    if (BLOCKED_DOMAIN_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
      return false;
    }

    // 5. Block numeric integer / hex notation hostnames
    if (NUMERIC_IP_PATTERN.test(hostname)) return false;

    // 6. Check IPv4 blocked patterns
    if (IPV4_BLOCKED_PATTERNS.some((pattern) => pattern.test(hostname))) {
      return false;
    }

    // 7. Check IPv6 blocked patterns
    if (IPV6_BLOCKED_PATTERNS.some((pattern) => pattern.test(hostname))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
