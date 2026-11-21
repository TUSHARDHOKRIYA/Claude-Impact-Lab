import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const compressImageFile = vi.hoisted(() => vi.fn());
const createReportAction = vi.hoisted(() => vi.fn());

// The form always loads the voice hooks; their server actions cannot load under test.
vi.mock("@/lib/voice/actions", () => ({ processVoiceTurnAction: vi.fn() }));
vi.mock("@/lib/voice/speak-action", () => ({ speakPromptAction: vi.fn(async () => null) }));
vi.mock("@/lib/photo-compress", () => ({ compressImageFile }));
vi.mock("@/lib/actions", () => ({ createReportAction }));
vi.mock("@/components/report/PinMap", () => ({
  default: function PinMapStub() {
    return <div data-testid="pin-map">pin</div>;
  },
}));

import { ReportForm } from "@/components/report/ReportForm";
import { LANDMARKS } from "@/lib/city";

const PHOTO = "data:image/jpeg;base64,NEW";
const horse = LANDMARKS.find((item) => item.id === "black-horse");
if (!horse) throw new Error("black-horse landmark missing");

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
  await user.upload(screen.getByLabelText(/photo of what you can see/i), jpeg());
  await waitFor(() => expect(screen.getByText("Photo ready.")).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function goToDetails(user: ReturnType<typeof userEvent.setup>) {
  await passPhoto(user);
  await user.click(screen.getByRole("radio", { name: "Road" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function goToReview(user: ReturnType<typeof userEvent.setup>) {
  await goToDetails(user);
  await fillDetails(user);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Where is it?" })).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: "Jehangir Art Gallery" }));
  await user.click(screen.getByRole("button", { name: "Confirm this pin" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: "Today" }));
  await user.click(screen.getByRole("radio", { name: /single time/i }));
  await user.click(screen.getByRole("checkbox", { name: "Walking" }));
}

describe("ReportForm details and submit gating", () => {
  it("rejects empty details and associates recurs/affects errors", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await goToDetails(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("radio", { name: "Today" })).toHaveFocus();
    expect(screen.getByRole("group", { name: /when did you notice/i })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Say when you noticed it.")).toBeInTheDocument();
    const recurs = screen.getByRole("group", { name: /keep coming back/i });
    expect(recurs).toHaveAttribute("aria-describedby", "recurs-error");
    expect(document.getElementById("recurs-error")).toHaveTextContent(
      "Say whether this condition recurs.",
    );
    const affects = screen.getByRole("group", { name: /what does it affect/i });
    expect(affects).toHaveAttribute("aria-describedby", "affects-error");
    expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
  });

  it("stays on details until a noticed window is chosen", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await goToDetails(user);
    await user.click(screen.getByRole("radio", { name: /single time/i }));
    await user.click(screen.getByRole("checkbox", { name: "Walking" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("radio", { name: "Today" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "This week" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Where is it?" })).toBeInTheDocument();
    });
  });

  it("does not submit the action before Check", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await passPhoto(user);
    await user.click(screen.getByRole("radio", { name: "Road" }));
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
    });
    expect(createReportAction).not.toHaveBeenCalled();
  });

  it("keeps the draft when recording throws", async () => {
    const user = userEvent.setup();
    createReportAction.mockRejectedValue(new Error("network"));
    render(<ReportForm />);
    await goToReview(user);
    await user.click(screen.getByRole("button", { name: "Record this condition" }));
    await waitFor(() => {
      const alert = document.getElementById("report-form-alert");
      expect(alert).toHaveTextContent(
        "Could not record this condition. Your answers are still here; try again.",
      );
    });
    expect(screen.getByRole("heading", { name: /check this record/i })).toBeInTheDocument();
    expect(screen.getByText("Road")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Submitted" })).not.toBeInTheDocument();
  });

  it("focuses the form alert for a non-field action error", async () => {
    const user = userEvent.setup();
    createReportAction.mockResolvedValue({ ok: false, error: "Could not record this condition." });
    render(<ReportForm />);
    await goToReview(user);
    await user.click(screen.getByRole("button", { name: "Record this condition" }));
    await waitFor(() => {
      const alert = document.getElementById("report-form-alert");
      expect(alert).toHaveTextContent("Could not record this condition.");
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
    await user.click(screen.getByRole("button", { name: "Record this condition" }));
    const back = screen.getByRole("button", { name: "Back" });
    expect(back).toBeDisabled();
    await user.click(back);
    expect(screen.getByRole("heading", { name: /check this record/i })).toBeInTheDocument();
    release({ ok: false, error: "Could not record this condition." });
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
    await goToDetails(user);
    await fillDetails(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Jehangir Art Gallery" }));
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    await user.click(screen.getByRole("button", { name: "Confirm this pin" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /check this record/i })).toBeInTheDocument());
    pending[0]?.({
      coords: { latitude: horse.lat, longitude: horse.lng },
    } as GeolocationPosition);
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText(/18\.92770,\s*72\.83185/)).toBeInTheDocument();
  });

  it("blocks Continue when an interaction changes a confirmed pin", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await goToDetails(user);
    await fillDetails(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Jehangir Art Gallery" }));
    await user.click(screen.getByRole("button", { name: "Confirm this pin" }));
    expect(screen.getByRole("button", { name: "Pin confirmed" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: horse.name }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Where is it?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm this pin" })).toBeInTheDocument();
    // Shown once: the location step has no field-level slot for it, so the form alert carries it.
    expect(screen.getAllByText("Confirm the map pin before continuing.")).toHaveLength(1);
    expect(document.getElementById("report-form-alert")).toHaveTextContent("Confirm the map pin before continuing.");
  });
});
