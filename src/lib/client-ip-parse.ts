const MAX_IP_LENGTH = 45;
const IP_TOKEN = /^[0-9a-fA-F.:]+$/;

function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  if (value.length === 0 || value.length > MAX_IP_LENGTH) return null;
  if (!IP_TOKEN.test(value)) return null;
  return value;
}

/**
 * CloudFront stamps the viewer address as `ip:port` — `203.0.113.9:54321` for
 * IPv4, `2001:db8::1:54321` for IPv6. The port is per-connection, so it has to
 * come off or every request lands in its own rate-limit bucket.
 */
function stripPort(raw: string): string {
  const lastColon = raw.lastIndexOf(":");
  if (lastColon <= 0) return raw;
  const tail = raw.slice(lastColon + 1);
  if (!/^\d{1,5}$/.test(tail)) return raw;
  const head = raw.slice(0, lastColon);
  if (head.startsWith("[") && head.endsWith("]")) return head.slice(1, -1);
  return head;
}

/**
 * Amplify Hosting SSR sits behind CloudFront, and `cloudfront-viewer-address`
 * is the only header on that path the viewer cannot set. `x-forwarded-for` is
 * `viewer, cloudfront-edge`: the leftmost hop is viewer-supplied, the rightmost
 * is the POP shared by every honest client in the region. Neither is an
 * identity. Returning null here is deliberate — callers put unidentified
 * requests in one shared bucket rather than skipping the limit.
 */
export function ipFromHeaders(get: (name: string) => string | null): string | null {
  const viewer = get("cloudfront-viewer-address");
  if (viewer) {
    const stripped = normalizeIp(stripPort(viewer.trim()));
    if (stripped) return stripped;
  }
  return null;
}
