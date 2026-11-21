import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShareBar } from "@/components/share/ShareBar";

afterEach(() => cleanup());

describe("ShareBar", () => {
  it("exposes WhatsApp, copy, and 48px GovButton targets", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <ShareBar
        path="/reports/rpt_1"
        title="Pothole on Dr Ambedkar Road"
        text="Pothole on Dr Ambedkar Road, A Ward."
      />,
    );

    expect(screen.getByRole("heading", { name: "Share this report" })).toBeInTheDocument();

    const whatsapp = screen.getByRole("link", { name: /whatsapp/i });
    expect(whatsapp).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
    expect(whatsapp.className).toMatch(/ux4g-btn-lg/);
    expect(whatsapp.className).not.toMatch(/ux4g-btn-md/);
    expect(whatsapp.className).toMatch(/touch-target/);
    expect(whatsapp).toHaveTextContent(/opens in a new tab/i);

    const tweet = screen.getByRole("link", { name: "X (opens in a new tab)" });
    expect(tweet).toHaveAttribute("href", expect.stringContaining("twitter.com/intent/tweet"));
    expect(tweet).toHaveAttribute("target", "_blank");
    expect(tweet.className).toMatch(/ux4g-btn-lg/);
    expect(tweet).toHaveTextContent(/opens in a new tab/i);

    const copy = screen.getByRole("button", { name: "Copy link" });
    expect(copy.className).toMatch(/ux4g-btn-lg/);
    expect(copy.className).toMatch(/touch-target/);
    await user.tab();
    expect(copy).toHaveFocus();
    await user.click(copy);
    expect(writeText).toHaveBeenCalled();
  });

  it("shows native share on a mobile user agent", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    render(
      <ShareBar path="/reports/rpt_1" title="Footpath" text="Footpath" />,
    );

    const native = await screen.findByRole("button", { name: "Share" });
    expect(native.className).toMatch(/ux4g-btn-lg/);
  });
});
