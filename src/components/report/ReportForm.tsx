"use client";

import { useState } from "react";

import { ReportDraft } from "@/components/report/ReportDraft";
import type { IssueType } from "@/lib/types";

type ReportFormProps = { initialIssueType?: IssueType; voiceEnabled?: boolean };

/** Remounts the draft after "Record another", which clears voice, photo, and the pin. */
export function ReportForm(props: ReportFormProps = {}) {
  const [generation, setGeneration] = useState(0);
  return (
    <ReportDraft
      key={generation}
      {...props}
      onAgain={() => setGeneration((current) => current + 1)}
    />
  );
}
