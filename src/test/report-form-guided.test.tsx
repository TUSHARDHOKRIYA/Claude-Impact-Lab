import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const compressImageFile = vi.hoisted(() => vi.fn());
const createReportAction = vi.hoisted(() => vi.fn());

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
import { REPORT_MSG } from "@/components/report/report-form-helpers";

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

async function passPhoto(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText(/photo of what you can see/i), jpeg());
  await waitFor(() => expect(screen.getByText("Photo ready.")).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function continueFromType(user: ReturnType<typeof userEvent.setup>) {
  await passPhoto(user);
  await user.click(screen.getByRole("radio", { name: /^pothole/i }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

describe("ReportForm guided steps", () => {
  it("opens on the photo step with no voice recorder offered", () => {
    render(<ReportForm />);
    expect(
      screen.getByRole("heading", { name: /photograph the problem/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start speaking" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voice" })).not.toBeInTheDocument();
  });

  it("blocks continue without a photo and stays on step 1", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getAllByText(REPORT_MSG.photo)).toHaveLength(1);
    expect(document.getElementById("photo-error")).toHaveTextContent(REPORT_MSG.photo);
    expect(document.getElementById("report-form-alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a photo" })).toHaveFocus();
    expect(screen.queryByRole("radio", { name: /^pothole/i })).not.toBeInTheDocument();
  });

  it("keeps a deep-linked type selected without skipping confirmation", async () => {
    const user = userEvent.setup();
    render(<ReportForm initialIssueType="pothole" />);
    await passPhoto(user);
    expect(screen.getByRole("radio", { name: /^pothole/i })).toBeChecked();
    expect(screen.getByRole("heading", { name: /what is wrong with the road/i })).toBeInTheDocument();
  });

  it("blocks continue without a type, marks radios invalid, and stays on the type step", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await passPhoto(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const group = screen.getByRole("group", { name: /what is wrong with the road/i });
    expect(group).toHaveAttribute("aria-describedby", "issueType-error");
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById("issueType-error")).toHaveTextContent(REPORT_MSG.issue);
    expect(screen.getAllByText(REPORT_MSG.issue)).toHaveLength(1);
    expect(screen.getByRole("radio", { name: /^pothole/i })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("radio", { name: /^pothole/i })).toHaveFocus();
  });

  it("moves focus to the history heading after a valid type step", async () => {
    const user = userEvent.setup();
    render(<ReportForm />);
    await continueFromType(user);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /when did you first notice it/i })).toHaveFocus();
    });
  });

  it("validates the history step before risk and place", async () => {
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

    // Step 3: History
    await user.click(screen.getByRole("radio", { name: "Today" }));
    await user.click(screen.getByRole("radio", { name: /no, or i don't know/i }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 4: Risk
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /have you seen an accident or a fall here/i })).toHaveFocus();
    });
    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 5: Place
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Where is it?" })).toHaveFocus();
    });
    expect(screen.getByTestId("pin-map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm this spot" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Hindmata" }));
    await user.click(screen.getByRole("button", { name: "Confirm this spot" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 6: Review
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /check your report/i })).toHaveFocus();
    });
    expect(screen.getByText(/Anonymous by default/i)).toBeInTheDocument();
    expect(screen.getByText("Pothole")).toBeInTheDocument();
    expect(screen.getByAltText("Preview of the street photo")).toHaveAttribute("src", PHOTO);
    expect(screen.getByText("Today")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Send report" });
    expect(submit.className).toMatch(/touch-target|ux4g-btn/);
    createReportAction.mockResolvedValue({ ok: true, reportId: "rpt_new" });
    await user.click(submit);
    expect(createReportAction).toHaveBeenCalledTimes(1);

    const data = createReportAction.mock.calls[0][0] as FormData;
    expect(data.get("issueType")).toBe("pothole");
    expect(data.get("photo")).toBe(PHOTO);
    expect(data.get("noticedWindow")).toBe("today");
    expect(data.get("recurs")).toBe("false");
    expect(data.get("accident")).toBe("none");
    expect(data.get("locationConfirmed")).toBe("true");
    expect(data.get("voiceTranscript")).toBe("");

    const submitted = await screen.findByRole("heading", { name: "Submitted" });
    expect(submitted).toHaveFocus();
    expect(screen.getByText("Your report is on the map and on the ward record now.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See it on the map" })).toHaveAttribute(
      "href",
      "/map?report=rpt_new&new=1",
    );
    expect(screen.getByRole("link", { name: "Open the report page" })).toHaveAttribute("href", "/reports/rpt_new");
    await user.click(screen.getByRole("button", { name: "Report another problem" }));
    expect(screen.getByRole("heading", { name: /photograph the problem/i })).toBeInTheDocument();
  });
});
