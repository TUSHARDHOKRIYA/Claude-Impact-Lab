import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "./csv";
import type { Contractor, Road, Ward, WorkOrder } from "./types";

/** Extra source shapes not needed in types.ts, defined here to keep that file intact. */
export type RateCardEntry = {
  method: string;
  unit: "per sqm" | "per job";
  rateInr: number;
};

export type Complaint = {
  id: string;
  receivedAt: string;
  channel: string;
  category: string;
  description: string;
  language: string;
  locality: string;
  ward: string | null;
  lat: number | null;
  lng: number | null;
  upvotes: number;
  status: string;
  resolvedAt: string | null;
};

export type FloodHotspot = {
  id: string;
  name: string;
  ward: string;
  lat: number;
  lng: number;
  floodThresholdMm: number;
  tideSensitive: boolean;
  avgWaterDepthCm: number;
  avgRecessionHours: number;
  pumpingStationNearby: boolean;
  yearsFlagged: number;
};

export type Rainfall = {
  date: string;
  station: string;
  rainfallMm: number;
  imdCategory: string;
  imdAlert: string;
};

export type Tide = {
  date: string;
  highTideTime: string;
  heightM: number;
  bigTideFlag: boolean;
};

export type Traffic = {
  roadId: string;
  peakHourVehicles: number;
  avgPeakSpeedKmph: number;
  congestionIndex: number;
  busRoutesCount: number;
  twoWheelerSharePct: number;
};

export type Accident = {
  id: string;
  occurredAt: string;
  ward: string;
  roadId: string;
  lat: number;
  lng: number;
  vehicleType: string;
  severity: string;
  probableCause: string;
};

export type Facility = {
  id: string;
  type: string;
  name: string;
  ward: string;
  lat: number;
  lng: number;
  bedsOrStudents: number;
  emergencyServices: boolean;
  ambulanceEntryRoad: string;
};

export type Dataset = {
  wards: Ward[];
  roads: Road[];
  workOrders: WorkOrder[];
  contractors: Contractor[];
  rateCard: RateCardEntry[];
  complaints: Complaint[];
  floodHotspots: FloodHotspot[];
  rainfall: Rainfall[];
  tides: Tide[];
  traffic: Traffic[];
  accidents: Accident[];
  facilities: Facility[];
};

const DATA_DIR = path.join(process.cwd(), "data", "rupee");
function readRows(file: string): Record<string, string>[] {
  return parseCsv(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
}

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nullableNum(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function yes(v: string | undefined): boolean {
  return (v ?? "").trim().toUpperCase() === "Y";
}

function splitList(v: string | undefined, separator: string): string[] {
  return (v ?? "")
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean);
}

function nullableText(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
}
function loadAll(): Dataset {
  const wards: Ward[] = readRows("wards.csv").map((r) => ({
    code: r.ward_code,
    name: r.ward_name,
    zone: r.zone,
    office: r.assistant_commissioner_office,
    centroid: { lat: num(r.centroid_lat), lng: num(r.centroid_lon) },
    areaKm2: num(r.approx_area_km2),
    population: num(r.population_est),
    lowLyingIndex: num(r.low_lying_index),
    crews: num(r.engineering_crews),
    budgetInr: num(r.monsoon_repair_budget_inr_2025),
    localities: splitList(r.localities, ";"),
  }));

  const roads: Road[] = readRows("roads.csv").map((r) => ({
    id: r.road_id,
    name: r.road_name,
    segmentNo: num(r.segment_no),
    ward: r.ward_code,
    roadType: r.road_type,
    surface: r.surface,
    lanes: num(r.lanes),
    lengthM: num(r.length_m),
    start: { lat: num(r.start_lat), lng: num(r.start_lon) },
    end: { lat: num(r.end_lat), lng: num(r.end_lon) },
    lastResurfaced: r.last_resurfaced,
    underDlp: yes(r.under_dlp),
    busRoute: yes(r.bus_route),
  }));

  const workOrders: WorkOrder[] = readRows("work_orders.csv").map((r) => ({
    id: r.work_order_id,
    complaintIds: splitList(r.linked_complaint_ids, "|"),
    ward: r.ward_code,
    roadId: r.road_id,
    workType: r.work_type,
    method: r.repair_method,
    contractorId: r.contractor_id,
    contractorName: r.contractor_name,
    assignedAt: r.assigned_at,
    startedAt: r.work_started_at,
    completedAt: r.completed_at,
    areaSqm: num(r.area_sqm),
    costInr: num(r.cost_inr),
    slaHours: num(r.sla_hours),
    slaMet: yes(r.sla_met),
    reopened: yes(r.reopened_within_30d),
    remark: r.engineer_remark,
  }));

  const contractors: Contractor[] = readRows("contractors.csv").map((r) => ({
    id: r.contractor_id,
    name: r.contractor_name,
    empanelledSince: num(r.empanelled_since),
    activeWards: splitList(r.active_wards, ";"),
  }));

  const rateCard: RateCardEntry[] = readRows("rate_card.csv").map((r) => ({
    method: r.repair_method,
    unit: r.unit === "per sqm" ? "per sqm" : "per job",
    rateInr: num(r.standard_rate_inr),
  }));
  const complaints: Complaint[] = readRows("complaints.csv").map((r) => ({
    id: r.complaint_id,
    receivedAt: r.received_at,
    channel: r.channel,
    category: r.category_reported,
    description: r.description,
    language: r.language,
    locality: r.locality_text,
    ward: nullableText(r.ward_code),
    lat: nullableNum(r.lat),
    lng: nullableNum(r.lon),
    upvotes: num(r.upvotes),
    status: r.status,
    resolvedAt: nullableText(r.resolved_at),
  }));

  const floodHotspots: FloodHotspot[] = readRows("flood_hotspots.csv").map((r) => ({
    id: r.hotspot_id,
    name: r.name,
    ward: r.ward_code,
    lat: num(r.lat),
    lng: num(r.lon),
    floodThresholdMm: num(r.flood_threshold_mm_per_day),
    tideSensitive: yes(r.tide_sensitive),
    avgWaterDepthCm: num(r.avg_water_depth_cm),
    avgRecessionHours: num(r.avg_recession_hours),
    pumpingStationNearby: yes(r.pumping_station_nearby),
    yearsFlagged: num(r.years_flagged_last_5),
  }));

  const rainfall: Rainfall[] = readRows("rainfall_daily.csv").map((r) => ({
    date: r.date,
    station: r.station,
    rainfallMm: num(r.rainfall_mm),
    imdCategory: r.imd_category,
    imdAlert: r.imd_alert,
  }));

  const tides: Tide[] = readRows("tides.csv").map((r) => ({
    date: r.date,
    highTideTime: r.high_tide_time,
    heightM: num(r.height_m),
    bigTideFlag: yes(r.big_tide_flag),
  }));

  const traffic: Traffic[] = readRows("traffic.csv").map((r) => ({
    roadId: r.road_id,
    peakHourVehicles: num(r.peak_hour_vehicles),
    avgPeakSpeedKmph: num(r.avg_peak_speed_kmph),
    congestionIndex: num(r.congestion_index_0_10),
    busRoutesCount: num(r.bus_routes_count),
    twoWheelerSharePct: num(r.two_wheeler_share_pct),
  }));

  const accidents: Accident[] = readRows("accidents.csv").map((r) => ({
    id: r.accident_id,
    occurredAt: r.occurred_at,
    ward: r.ward_code,
    roadId: r.road_id,
    lat: num(r.lat),
    lng: num(r.lon),
    vehicleType: r.vehicle_type,
    severity: r.severity,
    probableCause: r.probable_cause,
  }));

  const facilities: Facility[] = readRows("facilities.csv").map((r) => ({
    id: r.facility_id,
    type: r.type,
    name: r.name,
    ward: r.ward_code,
    lat: num(r.lat),
    lng: num(r.lon),
    bedsOrStudents: num(r.beds_or_students),
    emergencyServices: yes(r.emergency_services),
    ambulanceEntryRoad: r.ambulance_entry_road,
  }));
  return {
    wards,
    roads,
    workOrders,
    contractors,
    rateCard,
    complaints,
    floodHotspots,
    rainfall,
    tides,
    traffic,
    accidents,
    facilities,
  };
}

let cached: Dataset | null = null;

/** Load and parse the whole dataset once per process. */
export function loadDataset(): Dataset {
  if (!cached) cached = loadAll();
  return cached;
}
