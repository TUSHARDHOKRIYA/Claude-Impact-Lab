import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const compressImageFile = vi.hoisted(() => vi.fn());
const createReportAction = vi.hoisted(() => vi.fn());

// The form always loads the voice hooks; their server actions cannot load under test.
vi.mock("@/lib/voice/actions", () => ({ processVoiceTurnAction: vi.fn() }));
vi.mock("@/lib/voice/speak-action", () => ({ speakPromptAction: vi.fn(async () => null) }));
vi.mock("@/lib/photo-compress", () => ({ compressImageFile }));
vi.mock("@/lib/actions", () => ({ createReportAction }));
// Stubbed only so jsdom does not pull the server-only voice chain in through
// its import. The flag, not this mock, is what keeps the recorder off screen.
vi.mock("@/components/report/PinMap", () => ({
  default: function PinMapStub() {
    return <div data-testid="pin-map">pin</div>;
  },
}));

import { ReportForm } from "@/components/report/ReportForm";
import { describePlace } from "@/lib/place-name";
import { ISSUE_TYPE_LABELS } from "@/lib/types";

const PHOTO = "data:image/jpeg;base64,NEW";

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

/** Photo is step 1, so every other step is reached through it. */
async function passPhoto(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText(/photo of what you can see/i), jpeg());
  await waitFor(() => expect(screen.getByText("Photo ready.")).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function continueFromType(user: ReturnType<typeof userEvent.setup>) {
  await passPhoto(user);
  await user.click(screen.getByRole("radio", { name: "Road" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

describe("ReportForm guided steps", () => {
  it("opens on the photo step with no voice recorder offered", () => {
    render(<ReportForm />);
    expect(
      screen.getByRole("heading", { name: /photo of what you can see/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5 — Photo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start speaking" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voice" })).not.toBeInTheDocument();
  });

  it("blocks continue without a photo and stays on step 1", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    // Said once, under the photo buttons, not repeated in a second form-level box.
    expect(screen.getAllByText("Upload a JPEG, PNG, or WebP photo.")).toHaveLength(1);
    expect(document.getElementById("photo-error")).toHaveTextContent("Upload a JPEG, PNG, or WebP photo.");
    expect(document.getElementById("report-form-alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a photo" })).toHaveFocus();
    expect(screen.queryByRole("radio", { name: "Road" })).not.toBeInTheDocument();
  });

  it("keeps a deep-linked type selected without skipping confirmation", async () => {
    const user = userEvent.setup();
    render(<ReportForm initialIssueType="footpath" />);
    await passPhoto(user);
    expect(screen.getByRole("radio", { name: ISSUE_TYPE_LABELS.footpath })).toBeChecked();
    expect(screen.queryByRole("heading", { name: "Details" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what kind of condition/i })).toBeInTheDocument();
  });

  it("blocks continue without a type, marks radios invalid, and stays on the type step", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await passPhoto(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const group = screen.getByRole("group", { name: /what kind of condition/i });
    expect(group).toHaveAttribute("aria-describedby", "issue-type-error");
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById("issue-type-error")).toHaveTextContent("Choose an issue type.");
    expect(screen.getAllByText("Choose an issue type.")).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Road" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("radio", { name: "Road" })).toHaveFocus();
  });

  it("moves focus to the details heading after a valid type step", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await continueFromType(user);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Details" })).toHaveFocus();
    });
  });

  it("validates the details step before place", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await continueFromType(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("radio", { name: "Today" })).toHaveFocus();
    expect(screen.queryByRole("heading", { name: "Where is it?" })).not.toBeInTheDocument();
  });

  it("walks to review and submits the recorded fields", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await continueFromType(user);
    await user.click(screen.getByRole("radio", { name: "Today" }));
    await user.click(screen.getByRole("radio", { name: /single time/i }));
    await user.click(screen.getByRole("checkbox", { name: "Walking" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Where is it?" })).toHaveFocus();
    });
    expect(screen.getByTestId("pin-map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm this pin" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Jehangir Art Gallery" }));
    await user.click(screen.getByRole("button", { name: "Confirm this pin" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /check this record/i })).toHaveFocus();
    });
    expect(screen.getByText("Community report")).toBeInTheDocument();
    expect(screen.getByText("Anonymous by default")).toBeInTheDocument();
    expect(screen.getByText(`Pin confirmed at ${describePlace(18.9277, 72.83185)}`)).toBeInTheDocument();
    expect(screen.getByText("Road")).toBeInTheDocument();
    expect(screen.getByAltText("Preview of the street photo")).toHaveAttribute("src", PHOTO);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText(/single time/i)).toBeInTheDocument();
    expect(screen.getByText("Walking")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Record this condition" });
    expect(submit.className).toMatch(/touch-target|ux4g-btn/);
    createReportAction.mockResolvedValue({ ok: true, reportId: "rpt_new" });
    await user.click(submit);
    expect(createReportAction).toHaveBeenCalledTimes(1);
    const data = createReportAction.mock.calls[0][0] as FormData;
    expect(data.get("issueType")).toBe("road");
    expect(data.get("photo")).toBe(PHOTO);
    expect(data.get("lat")).toBe("18.9277");
    expect(data.get("lng")).toBe("72.83185");
    expect(data.get("noticedWindow")).toBe("today");
    expect(data.get("recurs")).toBe("false");
    expect(data.get("affects")).toBe(JSON.stringify(["walking"]));
    expect(data.get("locationConfirmed")).toBe("true");
    expect(data.get("voiceTranscript")).toBe("");
    const submitted = await screen.findByRole("heading", { name: "Submitted" });
    expect(submitted).toHaveFocus();
    expect(screen.getByText("Your report is on the map now.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See it on the map" })).toHaveAttribute(
      "href",
      "/map?report=rpt_new&new=1",
    );
    expect(screen.getByRole("link", { name: "Open the report page" })).toHaveAttribute("href", "/reports/rpt_new");
    await user.click(screen.getByRole("button", { name: "Record another" }));
    expect(screen.getByRole("heading", { name: /photo of what you can see/i })).toBeInTheDocument();
  });
});
