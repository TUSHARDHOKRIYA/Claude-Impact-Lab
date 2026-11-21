import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Manifest = {
  overrides?: Record<string, string>;
  engines?: { node?: string };
};

type LockPackage = {
  version?: string;
  resolved?: string;
  integrity?: string;
  link?: boolean;
  inBundle?: boolean;
  optional?: boolean;
  dev?: boolean;
  os?: string[];
  cpu?: string[];
  engines?: { node?: string };
};

type Lockfile = {
  packages?: Record<string, LockPackage>;
};

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function parseJson<T>(path: string): T {
  return JSON.parse(read(path)) as T;
}

export function allowsNode20(range: string | undefined): boolean {
  if (!range || range === "*") return true;
  return range.split("||").some((clause) => {
    const token = clause.trim();
    if (token === "*") return true;
    if (/^\^?~?v?20(\.|$)/.test(token)) return true;
    const minimum = token.match(/^(>=|>)\s*v?(\d+)/);
    if (!minimum) return false;
    const major = Number(minimum[2]);
    return minimum[1] === ">" ? major < 20 : major <= 20;
  });
}

function registryPackages(
  packages: Record<string, LockPackage>,
): Array<[string, LockPackage]> {
  return Object.entries(packages).filter(([key, pkg]) => {
    if (key === "") return false;
    if (pkg.link) return false;
    return Boolean(pkg.version);
  });
}

const NODE20_OPTIONAL_NATIVE_EXCEPTIONS = {
  "node_modules/@napi-rs/lzma-linux-x64-gnu": {
    version: "1.5.1",
    engines: "^22.20 || ^24.12 || >=25",
    evidence:
      "rollup 4.63.1 optional linux-x64 compressor; npm skips it on Node 20",
  },
} as const;

describe("Node 20 lock contract", () => {
  it("pins jsonlint to the Node-compatible 2.0.2 release", () => {
    const pkg = parseJson<Manifest>("package.json");
    expect(pkg.overrides?.["@mapbox/jsonlint-lines-primitives"]).toBe("2.0.2");
    const lock = parseJson<Lockfile>("package-lock.json");
    const pinned = lock.packages?.["node_modules/@mapbox/jsonlint-lines-primitives"];
    expect(pinned?.version).toBe("2.0.2");
    expect(allowsNode20(pinned?.engines?.node)).toBe(true);
  });

  it("keeps every lockfile engine declaration compatible with Node 20", () => {
    const lock = parseJson<Lockfile>("package-lock.json");
    const incompatible: string[] = [];
    for (const [key, pkg] of Object.entries(lock.packages ?? {})) {
      if (allowsNode20(pkg.engines?.node)) continue;
      const allowed =
        NODE20_OPTIONAL_NATIVE_EXCEPTIONS[
          key as keyof typeof NODE20_OPTIONAL_NATIVE_EXCEPTIONS
        ];
      if (allowed) {
        expect(pkg.version).toBe(allowed.version);
        expect(pkg.engines?.node).toBe(allowed.engines);
        expect(pkg.optional).toBe(true);
        expect(pkg.dev).toBe(true);
        expect(pkg.os).toEqual(["linux"]);
        expect(pkg.cpu).toEqual(["x64"]);
        continue;
      }
      incompatible.push(
        `${key}@${pkg.version ?? "?"} engines.node=${pkg.engines?.node}`,
      );
    }
    expect(incompatible, incompatible.join("\n")).toEqual([]);
  });

  it("records resolved and integrity for registry packages", () => {
    const lock = parseJson<Lockfile>("package-lock.json");
    const registry = registryPackages(lock.packages ?? {});
    const complete = registry.filter(([, pkg]) => {
      return (
        typeof pkg.resolved === "string" &&
        /^https:\/\//.test(pkg.resolved) &&
        typeof pkg.integrity === "string" &&
        /^sha(512|256|1)-/.test(pkg.integrity)
      );
    });
    const missing = registry
      .filter(([key]) => !complete.some(([done]) => done === key))
      .map(([key, pkg]) => key + (pkg.resolved ? "" : " [no-resolved]"));
    expect(registry.length).toBeGreaterThan(400);
    expect(complete.length / registry.length).toBeGreaterThan(0.95);
    expect(missing, missing.slice(0, 20).join("\n")).toEqual([]);
    expect(complete.length).toBe(registry.length);
  });
});

