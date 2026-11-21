import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DynamoKhabarRepository } from "@/lib/repo/dynamo";
import { getRepository, wantsMemoryRepository } from "@/lib/repo/context";
import { MemoryKhabarRepository } from "@/lib/repo/memory";

afterEach(() => {
  vi.unstubAllEnvs();
  delete (globalThis as { __khabarMemoryRepository?: unknown }).__khabarMemoryRepository;
});

describe("the local, Docker-free repository switch", () => {
  it("serves one shared in-memory repository in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("KHABAR_REPO", "memory");
    const repo = getRepository();
    expect(repo).toBeInstanceOf(MemoryKhabarRepository);
    expect(getRepository()).toBe(repo);
  });

  it("is ignored in production, so a deployed app always uses DynamoDB", () => {
    expect(wantsMemoryRepository({ NODE_ENV: "production", KHABAR_REPO: "memory" })).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("KHABAR_REPO", "memory");
    vi.stubEnv("KHABAR_TABLE_NAME", "khabar");
    expect(getRepository()).toBeInstanceOf(DynamoKhabarRepository);
  });

  it("is off unless asked for", () => {
    expect(wantsMemoryRepository({ NODE_ENV: "development" })).toBe(false);
    expect(wantsMemoryRepository({ NODE_ENV: "development", KHABAR_REPO: "dynamo" })).toBe(false);
  });
});
