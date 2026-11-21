import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const compressImageFile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/photo-compress", () => ({ compressImageFile }));

import { useReportPhoto } from "@/components/report/use-report-photo";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function file(type = "image/jpeg"): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], "street.jpg", {
    type,
  });
}

describe("useReportPhoto", () => {
  beforeEach(() => {
    compressImageFile.mockReset();
  });

  it("keeps the latest async photo selection", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    compressImageFile.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useReportPhoto());

    act(() => void result.current.onPhoto(file()));
    act(() => void result.current.onPhoto(file()));
    second.resolve("data:image/jpeg;base64,NEW");
    await waitFor(() => expect(result.current.photo).toBe("data:image/jpeg;base64,NEW"));

    first.resolve("data:image/jpeg;base64,OLD");
    await waitFor(() => expect(result.current.photo).toBe("data:image/jpeg;base64,NEW"));
  });

  it("rejects unsupported photo types before compression", async () => {
    const { result } = renderHook(() => useReportPhoto());
    await act(() => result.current.onPhoto(file("image/gif")));
    expect(result.current.error).toBe("Use a JPEG, PNG, or WebP photo.");
    expect(result.current.photo).toBe("");
    expect(compressImageFile).not.toHaveBeenCalled();
  });
});
