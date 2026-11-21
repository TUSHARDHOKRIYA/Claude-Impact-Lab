import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DynamoRastabaazRepository } from "@/lib/repo/dynamo";
import { getRepository, wantsMemoryRepository } from "@/lib/repo/context";
import { MemoryRastabaazRepository } from "@/lib/repo/memory";

afterEach(() => {
  vi.unstubAllEnvs();
  delete (globalThis as { __rastabaazMemoryRepository?: unknown }).__rastabaazMemoryRepository;
});

describe("the local, Docker-free repository switch", () => {
  it("serves one shared in-memory repository in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RASTABAAZ_REPO", "memory");
    const repo = getRepository();
    expect(repo).toBeInstanceOf(MemoryRastabaazRepository);
    expect(getRepository()).toBe(repo);
  });

  it("is ignored in production, so a deployed app always uses DynamoDB", () => {
    expect(wantsMemoryRepository({ NODE_ENV: "production", RASTABAAZ_REPO: "memory" })).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RASTABAAZ_REPO", "memory");
    vi.stubEnv("RASTABAAZ_TABLE_NAME", "rastabaaz");
    expect(getRepository()).toBeInstanceOf(DynamoRastabaazRepository);
  });

  it("is off unless asked for", () => {
    expect(wantsMemoryRepository({ NODE_ENV: "development" })).toBe(false);
    expect(wantsMemoryRepository({ NODE_ENV: "development", RASTABAAZ_REPO: "dynamo" })).toBe(false);
  });
});
