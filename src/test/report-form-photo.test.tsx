import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const compressImageFile = vi.hoisted(() => vi.fn());

// The form always loads the voice hooks; their server actions cannot load under test.
vi.mock("@/lib/voice/actions", () => ({ processVoiceTurnAction: vi.fn() }));
vi.mock("@/lib/voice/speak-action", () => ({ speakPromptAction: vi.fn(async () => null) }));
vi.mock("@/lib/photo-compress", () => ({
  compressImageFile,
}));

vi.mock("@/lib/actions", () => ({
  createReportAction: vi.fn(),
}));

vi.mock("@/components/report/PinMap", () => ({
  default: function PinMapStub() {
    return <div data-testid="pin-map">pin</div>;
  },
}));

import { ReportForm } from "@/components/report/ReportForm";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function jpeg(name: string): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: "image/jpeg" });
}

function hiddenPhoto(): HTMLInputElement {
  const fields = document.querySelectorAll('input[name="photo"]');
  return fields[fields.length - 1] as HTMLInputElement;
}

function asFileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    *[Symbol.iterator]() {
      yield* files;
    },
  } as FileList & { [index: number]: File };
  files.forEach((file, index) => {
    list[index] = file;
  });
  return list;
}

function changeFiles(input: HTMLInputElement, files: File[]) {
  fireEvent.change(input, { target: { files: asFileList(files) } });
}

describe("ReportForm photo selection", () => {
  afterEach(() => {
    cleanup();
    compressImageFile.mockReset();
  });

  beforeEach(() => {
    compressImageFile.mockReset();
  });

  it("lets the latest selection win and ignores a stale compress", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    compressImageFile.mockImplementationOnce(() => first.promise);
    compressImageFile.mockImplementationOnce(() => second.promise);

    const user = userEvent.setup();
    render(<ReportForm />);
    const input = screen.getByLabelText(/A photo of what you can see/i);

    await user.upload(input, jpeg("first.jpg"));
    expect(screen.getByText("Compressing photo…")).toBeInTheDocument();
    await user.upload(input, jpeg("second.jpg"));

    second.resolve("data:image/jpeg;base64,NEW");
    await waitFor(() => {
      expect(hiddenPhoto().value).toBe("data:image/jpeg;base64,NEW");
      expect(screen.getByText("Photo ready.")).toBeInTheDocument();
    });

    first.resolve("data:image/jpeg;base64,OLD");
    await waitFor(() => {
      expect(hiddenPhoto().value).toBe("data:image/jpeg;base64,NEW");
    });
    expect(screen.getByText("Photo ready.")).toBeInTheDocument();
    expect(screen.queryByText("stale first failed")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Preview of the street photo")).toHaveAttribute(
      "src",
      "data:image/jpeg;base64,NEW",
    );

    const staleFail = deferred<string>();
    const laterOk = deferred<string>();
    compressImageFile.mockImplementationOnce(() => staleFail.promise);
    compressImageFile.mockImplementationOnce(() => laterOk.promise);
    await user.upload(input, jpeg("fail.jpg"));
    await user.upload(input, jpeg("ok.jpg"));
    staleFail.reject(new Error("stale first failed"));
    laterOk.resolve("data:image/jpeg;base64,OK");
    await waitFor(() => {
      expect(hiddenPhoto().value).toBe("data:image/jpeg;base64,OK");
    });
    expect(screen.queryByText("stale first failed")).not.toBeInTheDocument();
  });

  it("does not let a stale compress overwrite a later invalid or cleared file", async () => {
    const first = deferred<string>();
    compressImageFile.mockImplementationOnce(() => first.promise);

    const user = userEvent.setup();
    render(<ReportForm />);
    const input = screen.getByLabelText(/A photo of what you can see/i);

    await user.upload(input, jpeg("first.jpg"));
    expect(screen.getByText("Compressing photo…")).toBeInTheDocument();

    changeFiles(
      input as HTMLInputElement,
      [new File([new Uint8Array([1])], "bad.gif", { type: "image/gif" })],
    );
    expect(screen.getByText("Use a JPEG, PNG, or WebP photo.")).toBeInTheDocument();
    expect(hiddenPhoto().value).toBe("");

    first.resolve("data:image/jpeg;base64,STALE");
    await waitFor(() => {
      expect(hiddenPhoto().value).toBe("");
      expect(screen.getByText("Use a JPEG, PNG, or WebP photo.")).toBeInTheDocument();
    });
    expect(screen.queryByText("Photo ready.")).not.toBeInTheDocument();
    expect(document.querySelector('img[src="data:image/jpeg;base64,STALE"]')).toBeNull();

    const leftover = deferred<string>();
    compressImageFile.mockImplementationOnce(() => leftover.promise);
    await user.upload(input, jpeg("again.jpg"));
    changeFiles(input as HTMLInputElement, []);
    leftover.resolve("data:image/jpeg;base64,AGAIN");

    await waitFor(() => {
      expect(hiddenPhoto().value).toBe("");
      expect(screen.queryByText("Photo ready.")).not.toBeInTheDocument();
    });
    expect(document.querySelector('img[alt="Preview of the street photo"]')).toBeNull();
  });

  it("accepts a File with type image/jpg", async () => {
    compressImageFile.mockResolvedValue("data:image/jpeg;base64,JPG");
    const user = userEvent.setup();
    render(<ReportForm />);
    const input = screen.getByLabelText(/A photo of what you can see/i);
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "street.jpg", {
      type: "image/jpg",
    });
    await user.upload(input, file);
    await waitFor(() => {
      expect(hiddenPhoto().value).toBe("data:image/jpeg;base64,JPG");
      expect(screen.getByText("Photo ready.")).toBeInTheDocument();
    });
    expect(compressImageFile).toHaveBeenCalledWith(file);
  });
});
