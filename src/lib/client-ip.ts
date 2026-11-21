import "server-only";

import { headers } from "next/headers";

import { ipFromHeaders } from "@/lib/client-ip-parse";

export async function clientIp(): Promise<string | null> {
  try {
    const incoming = await headers();
    return ipFromHeaders((name) => incoming.get(name));
  } catch {
    return null;
  }
}
