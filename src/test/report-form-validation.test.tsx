import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const compressImageFile = vi.hoisted(() => vi.fn());
const createReportAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/voice/actions", () => ({ processVoiceTurnAction: vi.fn() }));
vi.mock("@/lib/voice/speak-action", () => ({ speakPromptAction: vi.fn(async () => null) }));
vi.mock("@/lib/photo-compress", () => ({ compressImageFile }));
vi.mock("@/lib/actions", () => ({ createReportAction }));
vi.mock("@/components/report/PlacePickerMap", async () => {
  const { PlacePickerMapStub } = await import("@/test/place-picker-map-stub");
  return { default: PlacePickerMapStub, MIN_PIN_ZOOM: 14 };
});

import { ReportForm } from "@/components/report/ReportForm";
import { REPORT_MSG } from "@/components/report/report-form-helpers";
import { LANDMARKS } from "@/lib/city";

const PHOTO = "data:image/jpeg;base64,NEW";
const hindmata = LANDMARKS.find((item) => item.name === "Hindmata");
if (!hindmata) throw new Error("Hindmata area missing");

function jpeg(): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], "street.jpg", {
    type: "image/jpeg",
  });
}

afterEach(() => {
  cleanup();
  compressImageFile.mockReset();
  createReportAction.mockReset();
});

beforeEach(() => {
  compressImageFile.mockResolvedValue(PHOTO);
});

/** Photo is step 1, so every walk starts by clearing it. */
async function passPhoto(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText("Road photo", { selector: "input" }), jpeg());
  await waitFor(() => expect(screen.getByText("Photo ready.")).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function goToHistory(user: ReturnType<typeof userEvent.setup>) {
  await passPhoto(user);
  await user.click(screen.getByRole("radio", { name: /^pothole/i }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function goToPlace(user: ReturnType<typeof userEvent.setup>) {
  await goToHistory(user);
  // One question per screen: noticed, repeat, safety, then the optional note.
  await user.click(screen.getByRole("radio", { name: "Today" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /fixed before and come back/i })).toBeInTheDocument());
  await user.click(screen.getByRole("radio", { name: /no, or i don't know/i }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /have you seen an accident or a fall here/i })).toBeInTheDocument());
  await user.click(screen.getByRole("radio", { name: "No" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /anything else people should know/i })).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: "Skip" }));
}

async function goToReview(user: ReturnType<typeof userEvent.setup>) {
  await goToPlace(user);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Where is it?" })).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: "Hindmata" }));
  // Confirm location confirms the pin and advances to Check in one tap.
  await user.click(screen.getByRole("button", { name: "Confirm location" }));
}

function confirmedField(): HTMLInputElement {
  return document.querySelector('input[name="locationConfirmed"]') as HTMLInputElement;
}

describe("ReportForm details and submit gating", () => {
  it("rejects empty history and associates error messages", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await goToHistory(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("radio", { name: "Today" })).toHaveFocus();
    expect(screen.getByRole("group", { name: /when did you first notice it/i })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(REPORT_MSG.noticedWindow)).toBeInTheDocument();
    const recurs = screen.getByRole("group", { name: /when did you first notice it/i });
    expect(recurs).toHaveAttribute("aria-describedby", "noticedWindow-error");
    expect(document.getElementById("noticedWindow-error")).toHaveTextContent(
      REPORT_MSG.noticedWindow,
    );
    expect(screen.getByRole("heading", { name: /when did you first notice it/i })).toBeInTheDocument();
  });

  it("stays on history until a noticed window is chosen", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await goToHistory(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("radio", { name: "Today" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: /when did you first notice it/i })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "This week" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /fixed before and come back/i })).toBeInTheDocument();
    });
  });

  it("does not submit the action before Check", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await passPhoto(user);
    await user.click(screen.getByRole("radio", { name: /^pothole/i }));
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /when did you first notice it/i })).toBeInTheDocument();
    });
    expect(createReportAction).not.toHaveBeenCalled();
  });

  it("keeps the draft when recording throws", async () => {
    const user = userEvent.setup();
    createReportAction.mockRejectedValue(new Error("network"));
    render(<ReportForm />);
    await goToReview(user);
    await user.click(screen.getByRole("button", { name: "Send report" }));
    await waitFor(() => {
      const alert = document.getElementById("report-form-alert");
      expect(alert).toHaveTextContent(
        "Could not send your report. Your answers are still here, so try again.",
      );
    });
    expect(screen.getByRole("heading", { name: /check your report/i })).toBeInTheDocument();
    expect(screen.getByText("Pothole")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Thanks for letting us know!" })).not.toBeInTheDocument();
  });

  it("focuses the form alert for a non-field action error", async () => {
    const user = userEvent.setup();
    createReportAction.mockResolvedValue({ ok: false, error: "Could not record this report." });
    render(<ReportForm />);
    await goToReview(user);
    await user.click(screen.getByRole("button", { name: "Send report" }));
    await waitFor(() => {
      const alert = document.getElementById("report-form-alert");
      expect(alert).toHaveTextContent("Could not record this report.");
      expect(alert).toHaveFocus();
    });
  });

  it("disables Back while submit is pending", async () => {
    const user = userEvent.setup();
    let release!: (value: { ok: false; error: string }) => void;
    createReportAction.mockImplementation(
      () => new Promise<{ ok: false; error: string }>((resolve) => {
        release = resolve;
      }),
    );
    render(<ReportForm />);
    await goToReview(user);
    await user.click(screen.getByRole("button", { name: "Send report" }));
    const back = screen.getByRole("button", { name: "Back" });
    expect(back).toBeDisabled();
    await user.click(back);
    expect(screen.getByRole("heading", { name: /check your report/i })).toBeInTheDocument();
    release({ ok: false, error: "Could not record this report." });
    await waitFor(() => expect(back).not.toBeDisabled());
  });

  it("ignores a late locate after leaving Place", async () => {
    const user = userEvent.setup();
    const pending: PositionCallback[] = [];
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) => pending.push(ok),
      },
    });
    render(<ReportForm />);
    await goToPlace(user);
    await user.click(screen.getByRole("button", { name: "Hindmata" }));
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    await user.click(screen.getByRole("button", { name: "Confirm location" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /check your report/i })).toBeInTheDocument());
    pending[0]?.({
      coords: { latitude: hindmata.lat, longitude: hindmata.lng },
    } as GeolocationPosition);
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Reporting this spot")).toBeInTheDocument();
  });

  it("invalidates a confirmed pin when the pin moves, until it is confirmed again", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await goToPlace(user);
    await user.click(screen.getByRole("button", { name: "Hindmata" }));
    await user.click(screen.getByRole("button", { name: "Confirm location" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /check your report/i })).toBeInTheDocument());
    expect(confirmedField()).toHaveValue("true");

    await user.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Where is it?" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Sion" }));
    expect(confirmedField()).toHaveValue("false");

    await user.click(screen.getByRole("button", { name: "Confirm location" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /check your report/i })).toBeInTheDocument());
    expect(confirmedField()).toHaveValue("true");
  });
});
