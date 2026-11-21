import { STEP } from "@/components/report/TapAnswerSteps";

/** Whether the current screen has its answer, so the footer button can go forward. */
export function stepReady(
  step: number,
  answers: { photo: boolean; issueType: string; noticedWindow: string; recurs: string; accident: string; pin: boolean },
): boolean {
  const needs: Record<number, boolean> = {
    [STEP.photo]: answers.photo,
    [STEP.issue]: Boolean(answers.issueType),
    [STEP.noticed]: Boolean(answers.noticedWindow),
    [STEP.recurs]: Boolean(answers.recurs),
    [STEP.accident]: Boolean(answers.accident),
    [STEP.place]: answers.pin,
  };
  return needs[step] ?? true;
}
