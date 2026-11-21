"use client";

import { useEffect, useId, useRef, useState } from "react";

import { CalendarIcon } from "@/components/map/map-icons";

export type DateRange = { from: string | null; to: string | null };

const NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep 2025" from a YYYY-MM-DD day. */
const monthName = (day: string) => `${NAMES[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
/** "3 Sep" from a YYYY-MM-DD day. */
const dayName = (day: string) => `${Number(day.slice(8, 10))} ${NAMES[Number(day.slice(5, 7)) - 1]}`;

function lastDayOf(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Every calendar month between two days, newest first. */
function monthsBetween(min: string, max: string): string[] {
  const out: string[] = [];
  let [y, m] = min.slice(0, 7).split("-").map(Number);
  const end = max.slice(0, 7);
  for (let guard = 0; guard < 24; guard += 1) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(key);
    if (key >= end) break;
    m += 1;
    if (m > 12) [y, m] = [y + 1, 1];
  }
  return out.reverse();
}

function isMonth(range: DateRange, month: string): boolean {
  return range.from === `${month}-01` && range.to === lastDayOf(month);
}

export function rangeLabel(range: DateRange): string {
  const { from, to } = range;
  if (!from && !to) return "Any date";
  if (from && to && from.slice(0, 7) === to.slice(0, 7) && isMonth(range, from.slice(0, 7))) {
    return monthName(from);
  }
  if (from && to) return `${dayName(from)} – ${dayName(to)}`;
  return from ? `From ${dayName(from)}` : `Until ${dayName(to!)}`;
}

/**
 * "Date reported": a chip that opens a small panel with one-tap months (only
 * the months that have reports) and a from–to pair of native date fields.
 */
export function ReportedDateFilter({
  bounds,
  value,
  onChange,
}: {
  bounds: { min: string; max: string } | null;
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const active = Boolean(value.from || value.to);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        buttonRef.current?.focus();
      } else if (wrapRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const months = bounds ? monthsBetween(bounds.min, bounds.max) : [];

  return (
    <div className="rb-date" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={active ? "rb-select-chip rb-select-chip-on" : "rb-select-chip"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((was) => !was)}
      >
        <CalendarIcon />
        <span className="rb-date-label">
          <span className="sr-only">Date reported: </span>
          {rangeLabel(value)}
        </span>
      </button>

      {open ? (
        <div id={panelId} className="rb-date-pop" role="group" aria-label="Date reported">
          <p className="ux4g-heading-xs-strong">Date reported</p>
          {months.length ? (
            <div className="rb-date-months">
              {months.map((month) => (
                <button
                  key={month}
                  type="button"
                  className="rb-chip touch-target"
                  aria-pressed={isMonth(value, month)}
                  onClick={() => onChange({ from: `${month}-01`, to: lastDayOf(month) })}
                >
                  {monthName(`${month}-01`)}
                </button>
              ))}
            </div>
          ) : null}
          <div className="rb-date-fields">
            <label>
              <span className="ux4g-body-s-strong">From</span>
              <input
                type="date"
                value={value.from ?? ""}
                min={bounds?.min}
                max={value.to ?? bounds?.max}
                onChange={(event) => onChange({ ...value, from: event.target.value || null })}
              />
            </label>
            <label>
              <span className="ux4g-body-s-strong">To</span>
              <input
                type="date"
                value={value.to ?? ""}
                min={value.from ?? bounds?.min}
                max={bounds?.max}
                onChange={(event) => onChange({ ...value, to: event.target.value || null })}
              />
            </label>
          </div>
          <div className="rb-date-actions">
            <button
              type="button"
              className="ux4g-btn ux4g-btn-m ux4g-btn-text-primary touch-target"
              disabled={!active}
              onClick={() => onChange({ from: null, to: null })}
            >
              Clear
            </button>
            <button
              type="button"
              className="ux4g-btn ux4g-btn-m ux4g-btn-primary touch-target"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
