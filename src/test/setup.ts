import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Unmount between tests, once, for every file.
 *
 * Testing Library only registers this itself when `globals` is on, and it is
 * not, so each file was left to remember. The ones that forgot left React
 * mounted, and its scheduler then flushed work after jsdom was torn down:
 * "window is not defined", from a file that had already passed. It surfaced
 * as a CI-only flake because it needs the teardown to lose that race.
 */
afterEach(cleanup);

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  }) as MediaQueryList;
}
