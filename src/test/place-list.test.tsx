import { createRef, useState, type RefObject } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceList } from "@/components/map/PlaceList";
import { PlacePreview } from "@/components/map/PlacePreview";
import { MapFilters } from "@/components/map/MapFilters";
import type { MapReportPoint, PlaceSummary } from "@/lib/types";

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

vi.mock("@/components/map/KalaGhodaMap", async () => {
  const { PlacePreview: Preview } = await import("@/components/map/PlacePreview");
  return {
    KalaGhodaMap: ({
      places,
      selectedId,
      onSelect,
      openerRef,
    }: {
      places: PlaceSummary[];
      selectedId?: string | null;
      onSelect?: (locationId: string | null) => void;
      openerRef?: RefObject<HTMLElement | null>;
    }) => {
      const selected = places.find((item) => item.location.id === selectedId);
      return (
        <div data-testid="kg-map-enhancement">
          {selected && onSelect ? (
            <Preview
              place={selected}
              onClose={() => onSelect(null)}
              openerRef={openerRef}
            />
          ) : (
            "map"
          )}
        </div>
      );
    },
  };
});

const place: PlaceSummary = {
  location: {
    id: "loc_1",
    name: "K Dubash Marg footpath, Kala Ghoda Part 2",
    slug: "k-dubash-marg-kala-ghoda-part-2-footpath",
    issueType: "footpath",
    lat: 18.9298,
    lng: 72.8328,
    street: "K Dubash Marg",
    ward: "A Ward",
    createdAt: "2022-08-18",
  },
  reportCount: 4,
  recurring: true,
  latestReport: null,
};

const point: MapReportPoint = {
  id: "rpt_1",
  locationId: "loc_1",
  lat: 18.9298,
  lng: 72.8328,
  issueType: "footpath",
  noticedAt: "2022-08-18",
};

function PreviewHarness() {
  const openerRef = createRef<HTMLButtonElement>();
  const [open, setOpen] = useState(true);
  return (
    <>
      <button ref={openerRef} type="button">
        Open preview
      </button>
      {open ? (
        <PlacePreview
          place={place}
          openerRef={openerRef}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function stubMatchMedia(matches: boolean, addEventListener = vi.fn()) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener,
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  return addEventListener;
}

describe("PlaceList", () => {
  it("lists places as links without requiring the map", async () => {
    const user = userEvent.setup();
    render(<PlaceList places={[place]} selectedId={null} onSelect={() => undefined} />);
    const link = screen.getByRole("link", { name: /K Dubash Marg footpath/i });
    expect(link).toHaveAttribute("href", "/places/k-dubash-marg-kala-ghoda-part-2-footpath");
    expect(link.className).toMatch(/touch-target/);
    await user.tab();
    expect(link).toHaveFocus();
  });

  it("marks the selected row and uses UX4G list classes", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <PlaceList places={[place]} selectedId="loc_1" onSelect={onSelect} />,
    );
    const list = within(container).getByRole("list");
    expect(list.className).toMatch(/ux4g-list/);
    expect(container.querySelector(".ux4g-list-item")).not.toBeNull();
    const link = within(container).getByRole("link", { name: /K Dubash Marg footpath/i });
    expect(link).toHaveAttribute("aria-current", "true");
    expect(within(link).getByText("K Dubash Marg")).toBeInTheDocument();
    expect(within(link).getByText("4 reports")).toBeInTheDocument();
    expect(within(link).getByText("Footpath")).toBeInTheDocument();
    await user.click(link);
    expect(onSelect).toHaveBeenCalledWith("loc_1", link);
  });
});

describe("PlacePreview", () => {
  it("closes on Escape from a non-modal dialog with 48px controls", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PlacePreview place={place} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "false");
    expect(dialog.className).toMatch(/ux4g-card/);
    const close = screen.getByRole("button", { name: /close this place preview/i });
    expect(close.className).toMatch(/touch-target|ux4g-btn/);
    expect(screen.getByText("Footpath").className).toMatch(/ux4g-tag-text-info/);
    expect(screen.getByText("Footpath").className).not.toMatch(/ux4g-badge/);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("restores focus to the explicit opener on Escape", async () => {
    const user = userEvent.setup();
    render(<PreviewHarness />);
    const opener = screen.getByRole("button", { name: "Open preview" });
    const close = screen.getByRole("button", { name: /close this place preview/i });
    close.focus();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("restores focus to the explicit opener on Close", async () => {
    const user = userEvent.setup();
    render(<PreviewHarness />);
    const opener = screen.getByRole("button", { name: "Open preview" });
    const close = screen.getByRole("button", { name: /close this place preview/i });
    close.focus();
    await user.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe("MapFilters", () => {
  it("always offers the place list and always renders the map", async () => {
    render(<MapFilters points={[point]} places={[place]} />);
    expect(screen.getByRole("link", { name: /K Dubash Marg footpath/i })).toBeInTheDocument();
    expect(screen.queryByText("Show the map")).not.toBeInTheDocument();
    expect(await screen.findByTestId("kg-map-enhancement")).toBeInTheDocument();
    expect(screen.getByLabelText("Issue type").tagName).toBe("SELECT");
    expect(screen.getByRole("radio", { name: "All time" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Past year" })).toBeInTheDocument();
  });

  it("leads with the map in the DOM so a phone meets it before the list", async () => {
    const map = render(<MapFilters points={[point]} places={[place]} />);
    void map;
    const canvas = await screen.findByTestId("kg-map-enhancement");
    const panel = canvas.closest(".kg-map-panel");
    expect(panel).not.toBeNull();
    const split = panel?.closest(".kg-map-split");
    expect(split).not.toBeNull();
    expect(split?.firstElementChild).toBe(panel);
  });

  it("mounts the map on a narrow viewport with no toggle to press", async () => {
    stubMatchMedia(false);
    render(<MapFilters points={[point]} places={[place]} />);
    expect(await screen.findByTestId("kg-map-enhancement")).toBeInTheDocument();
    expect(document.querySelector("details")).toBeNull();
  });

  it("restores focus to the place-list opener when the preview closes", async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    render(<MapFilters points={[point]} places={[place]} />);
    await screen.findByTestId("kg-map-enhancement");
    const link = screen.getByRole("link", { name: /K Dubash Marg footpath/i });
    await user.click(link);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    screen.getByRole("button", { name: /close this place preview/i }).focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(link).toHaveFocus();
  });
});
