import { createRef, useState, type RefObject } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

vi.mock("@/components/map/CityMap", async () => {
  const { PlacePreview: Preview } = await import("@/components/map/PlacePreview");
  return {
    CityMap: ({
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
        <div data-testid="rb-map-enhancement">
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
    name: "Pothole on Dr Ambedkar Road, Parel",
    slug: "dr-ambedkar-road-parel-pothole",
    issueType: "pothole",
    lat: 18.9298,
    lng: 72.8328,
    street: "Dr Ambedkar Road",
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
  issueType: "pothole",
  noticedAt: "2022-08-18",
  reportedAt: "2022-08-18",
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
    const link = screen.getByRole("link", { name: /Dr Ambedkar Road/ });
    expect(link).toHaveAttribute("href", "/places/dr-ambedkar-road-parel-pothole");
    expect(link.className).toMatch(/touch-target/);
    await user.tab();
    expect(link).toHaveFocus();
  });

  it("marks the selected row and keeps the count and issue tag readable", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <PlaceList places={[place]} selectedId="loc_1" onSelect={onSelect} />,
    );
    const list = within(container).getByRole("list", { name: "Places in this filter" });
    expect(list.querySelectorAll("li")).toHaveLength(1);
    const link = within(container).getByRole("link", { name: /Dr Ambedkar Road/ });
    expect(link).toHaveAttribute("aria-current", "true");
    expect(within(link).getByText("Dr Ambedkar Road")).toBeInTheDocument();
    expect(within(link).getByText(/4 reports/)).toBeInTheDocument();
    expect(within(link).getByText("Pothole")).toBeInTheDocument();
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
    expect(screen.getByText("Pothole").className).toMatch(/ux4g-tag-tonal-info/);
    expect(screen.getByText("Pothole").className).not.toMatch(/ux4g-badge/);
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
    expect(screen.getByRole("link", { name: /Dr Ambedkar Road/ })).toBeInTheDocument();
    expect(screen.queryByText("Show the map")).not.toBeInTheDocument();
    expect(await screen.findByTestId("rb-map-enhancement")).toBeInTheDocument();
    expect(screen.getByLabelText("Problem type").tagName).toBe("SELECT");
    expect(screen.getByRole("button", { name: /Date reported: Any date/ })).toBeInTheDocument();
  });

  it("leads with the map in the DOM so a phone meets it before the list", async () => {
    render(<MapFilters points={[point]} places={[place]} />);
    const canvas = await screen.findByTestId("rb-map-enhancement");
    const mapWrap = canvas.closest(".rb-explore-map");
    const sheet = screen.getByRole("region", { name: "Reported road problems" }).querySelector(".rb-sheet");
    expect(mapWrap).not.toBeNull();
    expect(sheet).not.toBeNull();
    expect(mapWrap!.compareDocumentPosition(sheet!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("mounts the map on a narrow viewport with no toggle to press", async () => {
    stubMatchMedia(false);
    render(<MapFilters points={[point]} places={[place]} />);
    expect(await screen.findByTestId("rb-map-enhancement")).toBeInTheDocument();
    expect(document.querySelector("details")).toBeNull();
  });

  it("closes the inline preview on Escape and puts focus back on its list row", async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    render(<MapFilters points={[point]} places={[place]} />);
    await screen.findByTestId("rb-map-enhancement");
    const link = screen.getByRole("link", { name: /Dr Ambedkar Road/ });
    await user.click(link);
    const region = screen.getByRole("region", { name: "Reported road problems" });
    const selected = region.querySelector(".rb-sheet-selected") as HTMLElement;
    const dialog = within(selected).getByRole("dialog");
    within(dialog).getByRole("button", { name: /close this place preview/i }).focus();
    await user.keyboard("{Escape}");
    expect(within(selected).queryByRole("dialog")).not.toBeInTheDocument();
    const row = screen.getByRole("link", { name: /Dr Ambedkar Road/ });
    await waitFor(() => expect(row).toHaveFocus());
  });
});
