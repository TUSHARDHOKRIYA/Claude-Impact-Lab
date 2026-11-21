import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportPhotoField } from "@/components/report/ReportPhotoField";

afterEach(() => cleanup());

describe("ReportPhotoField", () => {
  it("exposes a camera capture input and a live error", () => {
    render(
      <ReportPhotoField
        preview=""
        status=""
        error="Use a JPEG, PNG, or WebP photo."
        onPhoto={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Road photo", { selector: "input" });
    expect(input).toHaveAttribute("capture", "environment");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/jpg,image/png,image/webp");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use a JPEG, PNG, or WebP photo.",
    );
  });

  it("offers a visible library button that triggers a non-tabbable file input", async () => {
    const user = userEvent.setup();
    const onPhoto = vi.fn();
    render(
      <ReportPhotoField
        preview=""
        status=""
        error={null}
        onPhoto={onPhoto}
      />,
    );
    const library = screen.getByRole("button", { name: /from gallery/i });
    expect(library.className).toMatch(/touch-target|ux4g-btn/);
    const hidden = document.getElementById("photo-library") as HTMLInputElement;
    expect(hidden).toHaveAttribute("tabIndex", "-1");
    expect(hidden).not.toHaveAttribute("capture");
    expect(hidden).toHaveAttribute("accept", "image/jpeg,image/jpg,image/png,image/webp");
    const click = vi.spyOn(hidden, "click");
    await user.click(library);
    expect(click).toHaveBeenCalled();
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "street.jpg", {
      type: "image/jpeg",
    });
    await user.upload(hidden, file);
    expect(onPhoto).toHaveBeenCalledWith(file);
    hidden.focus();
    await user.tab();
    expect(hidden).not.toHaveFocus();
  });

  it("opens the camera from a real button instead of showing the browser's bare file box", async () => {
    const user = userEvent.setup();
    render(<ReportPhotoField preview="" status="" error={null} onPhoto={vi.fn()} />);
    const camera = document.getElementById("photo-file") as HTMLInputElement;
    expect(camera).toHaveClass("sr-only");
    expect(camera).toHaveAttribute("tabIndex", "-1");
    const click = vi.spyOn(camera, "click");
    await user.click(screen.getByRole("button", { name: "Take a photo" }));
    expect(click).toHaveBeenCalled();
  });
});
