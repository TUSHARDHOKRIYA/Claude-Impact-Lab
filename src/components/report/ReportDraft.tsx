"use client";

import { useLayoutEffect, useRef, useState, useTransition, type FormEvent } from "react";

import { GovProgress } from "@/components/gov/GovProgress";
import { AnswerModeToggle, type AnswerMode } from "@/components/report/AnswerModeToggle";
import { ReportPhotoField } from "@/components/report/ReportPhotoField";
import { ReportReview } from "@/components/report/ReportReview";
import { SubmittedPanel } from "@/components/report/SubmittedPanel";
import { STEP, STEP_LABELS, TapAnswerSteps } from "@/components/report/TapAnswerSteps";
import type { ReportAnswers, SummarySection } from "@/components/report/ReportSummary";
import { VoiceChat } from "@/components/report/VoiceChat";
import { ReportFormFooter } from "@/components/report/ReportFormFooter";
import {
  FORM_ALERT_ID,
  REPORT_MSG,
  answersProblem,
  focusDetailsError,
  focusId,
  focusSelector,
  type DetailsErrors,
} from "@/components/report/report-form-helpers";
import { useReportPhoto } from "@/components/report/use-report-photo";
import { useReportVoice, type VoiceField } from "@/components/report/use-report-voice";
import { useVoiceConversation } from "@/components/report/use-voice-conversation";
import { createReportAction } from "@/lib/actions";
import { isInsideCity } from "@/lib/city";
import { ACCIDENT_SEEN, NOTICED_WINDOWS, type AccidentSeen, type IssueType, type NoticedWindow } from "@/lib/types";
import { VOICE_UI_ENABLED } from "@/lib/voice/ui-flag";

/**
 * Photo first: the evidence is already in their hand. Then one question per
 * screen, by tapping or in the voice chat (which covers issue to place), then Check.
 */
const EDIT_STEP: Record<SummarySection, number> = { problem: STEP.issue, place: STEP.place, answers: STEP.noticed };

export function ReportDraft({
  initialIssueType,
  voiceEnabled = VOICE_UI_ENABLED,
  onAgain,
}: {
  initialIssueType?: IssueType;
  voiceEnabled?: boolean;
  onAgain: () => void;
}) {
  const [step, setStep] = useState(1);
  const [issueType, setIssueType] = useState<IssueType | "">(initialIssueType ?? "");
  const [issueInvalid, setIssueInvalid] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const photoState = useReportPhoto(() => setFormError(null));
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const confirmedRef = useRef(false);
  confirmedRef.current = locationConfirmed;
  const [noticedWindow, setNoticedWindow] = useState<NoticedWindow | "">("");
  const [recurs, setRecurs] = useState<"" | "true" | "false">("");
  const [accident, setAccident] = useState<AccidentSeen | "">("");
  const [description, setDescription] = useState("");
  const [descriptionDone, setDescriptionDone] = useState(false);
  const [mode, setMode] = useState<AnswerMode>(voiceEnabled ? "voice" : "tap");
  const [detailsError, setDetailsError] = useState<DetailsErrors>({});
  const [pending, startTransition] = useTransition();
  const skipHeadingFocus = useRef(true);
  const focusAlert = useRef(false);
  const write = {
    issueType: (value: IssueType) => { setIssueType(value); setIssueInvalid(false); },
    noticedWindow: (value: NoticedWindow) => {
      setNoticedWindow(value);
      setDetailsError((current) => ({ ...current, noticedWindow: undefined }));
    },
    recurs: (value: "true" | "false") => { setRecurs(value); setDetailsError((c) => ({ ...c, recurs: undefined })); },
    description: setDescription,
    // Voice never moves a confirmed pin, even one confirmed while its turn was in flight.
    pin: (next: { lat: number; lng: number }) => { if (!confirmedRef.current) changePin(next); },
  };
  const values = { issueType, noticedWindow, recurs, description };
  const voice = useReportVoice(values, write);
  const convo = useVoiceConversation({
    values: { ...values, placeConfirmed: locationConfirmed, descriptionDone },
    hasPin: pin !== null,
    onResult: voice.applyResult,
    onAnswer: voice.answer,
    onPlace: changePin,
    onConfirmPlace: confirmPin,
    onDescriptionDone: () => setDescriptionDone(true),
  });
  const chatMode = voiceEnabled && mode === "voice";
  const chatting = chatMode && step > STEP.photo && step < STEP.review;
  /** A person's own edit: the value is theirs now, so the voice badge goes. */
  function edited<T>(field: VoiceField, apply: (value: T) => void) {
    return (value: T) => { apply(value); voice.userEdited(field); };
  }

  useLayoutEffect(() => {
    if (skipHeadingFocus.current) { skipHeadingFocus.current = false; return; }
    document.getElementById("report-step-heading")?.focus();
  }, [step]);
  useLayoutEffect(() => {
    if (!focusAlert.current || !formError) return;
    focusAlert.current = false;
    focusId(FORM_ALERT_ID);
  }, [formError]);
  function changePin(next: { lat: number; lng: number } | null) {
    setPin(next);
    setLocationConfirmed(false);
    setLocationError(null);
  }
  function confirmPin() { setLocationConfirmed(true); setLocationError(null); setFormError(null); }
  function switchMode(next: AnswerMode) { if (next !== mode) { setMode(next); goTo(STEP.issue); } }
  function finishChat() {
    const problem = answersProblem({ issueType, noticedWindow, recurs, pin, locationConfirmed });
    if (problem) setFormError(problem); else goTo(STEP.review);
  }
  function goTo(next: number) {
    if (pending) return;
    skipHeadingFocus.current = false; setFormError(null); setStep(next);
  }
  /** Each field shows its own error; the form alert is only for errors with no field to sit under. */
  function onContinue() {
    if (pending) return;
    if (step === STEP.photo && !photoState.photo) {
      photoState.setError(REPORT_MSG.photo);
      focusId("photo-take");
      return;
    }
    if (step === STEP.issue && !issueType) {
      setIssueInvalid(true);
      focusSelector('input[name="issueType"][type="radio"]');
      return;
    }
    const missing: DetailsErrors =
      step === STEP.noticed && !(NOTICED_WINDOWS as readonly string[]).includes(noticedWindow)
        ? { noticedWindow: REPORT_MSG.noticedWindow }
        : step === STEP.recurs && recurs !== "true" && recurs !== "false"
          ? { recurs: REPORT_MSG.recurs }
          : step === STEP.accident && !(ACCIDENT_SEEN as readonly string[]).includes(accident)
            ? { accident: REPORT_MSG.accident }
            : {};
    if (Object.keys(missing).length) {
      setDetailsError(missing);
      focusDetailsError(missing);
      return;
    }
    if (step === STEP.place) {
      // The footer button here is "Confirm location": it confirms the pin and moves on.
      if (!pin || !isInsideCity(pin.lat, pin.lng)) {
        setLocationError(REPORT_MSG.location);
        focusId("place-search");
        return;
      }
      confirmPin();
    }
    // This tap is the gesture that lets the chat's first question play aloud.
    if (step === STEP.photo && chatMode) convo.audio.prime();
    goTo(step + 1);
  }
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (step !== STEP.review) {
      onContinue();
      return;
    }
    setFormError(null);
    if (!accident) {
      setDetailsError((current) => ({ ...current, accident: REPORT_MSG.accident }));
      focusDetailsError({ accident: REPORT_MSG.accident });
      return;
    }
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await createReportAction(data);
        if (result?.ok) {
          setSubmittedId(result.reportId);
          return;
        }
        if (result) {
          focusAlert.current = true;
          setFormError(result.error);
        }
      } catch {
        focusAlert.current = true;
        setFormError("Could not send your report. Your answers are still here, so try again.");
      }
    });
  }
  const busy = pending || photoState.busy;
  const answers: ReportAnswers | null =
    issueType && pin && noticedWindow && (recurs === "true" || recurs === "false")
      ? { issueType, preview: photoState.preview, lat: pin.lat, lng: pin.lng, noticedWindow, recurs, accident, description }
      : null;
  if (submittedId && answers) {
    return <SubmittedPanel reportId={submittedId} answers={answers} lang={convo.lang} onAgain={onAgain} />;
  }
  const ready =
    step === STEP.photo
      ? Boolean(photoState.photo)
      : step === STEP.issue
        ? Boolean(issueType)
        : step === STEP.noticed
          ? Boolean(noticedWindow)
          : step === STEP.recurs
            ? Boolean(recurs)
            : step === STEP.accident
              ? Boolean(accident)
              : step === STEP.place
                ? pin !== null
                : true;
  const continueLabel =
    step === STEP.place ? "Confirm location" : step === STEP.note && !description.trim() ? "Skip" : "Continue";
  return (
    <form className="rb-report" data-step={submittedId ? "done" : step} noValidate onSubmit={onSubmit}>
      {voiceEnabled ? (
        <GovProgress current={step === STEP.photo ? 1 : step === STEP.review ? 3 : 2} labels={["Photo", "Answer", "Check"]} />
      ) : (
        <GovProgress current={step} labels={STEP_LABELS} />
      )}
      {step === STEP.photo ? (
        <div className="rb-step">
          <ReportPhotoField
            preview={photoState.preview}
            status={photoState.status}
            error={photoState.error}
            busy={photoState.busy}
            onPhoto={(file) => void photoState.onPhoto(file)}
          />
        </div>
      ) : null}
      {/* In voice mode the switch is the dock's Form button; here it is the way back to voice. */}
      {voiceEnabled && !chatMode && step > STEP.photo && step < STEP.review ? (
        <AnswerModeToggle mode={mode} onChange={switchMode} />
      ) : null}
      {chatting ? (
        <VoiceChat
          convo={convo}
          conflicts={voice.conflicts}
          pin={pin}
          placeConfirmed={locationConfirmed}
          onResolve={voice.resolve}
          onFinish={finishChat}
          onForm={() => switchMode("tap")}
        />
      ) : (
        <TapAnswerSteps
          step={step}
          issueType={issueType}
          issueInvalid={issueInvalid}
          noticedWindow={noticedWindow}
          recurs={recurs}
          accident={accident}
          description={description}
          detailsError={detailsError}
          voiceFilled={voice.voiceFilled}
          pin={pin}
          locationError={locationError}
          onIssueType={edited("issueType", write.issueType)}
          onNoticedWindow={edited("noticedWindow", write.noticedWindow)}
          onRecurs={edited("recurs", write.recurs)}
          onAccident={(value: AccidentSeen) => {
            setAccident(value);
            setDetailsError((current) => ({ ...current, accident: undefined }));
          }}
          onDescription={edited("description", setDescription)}
          onPin={changePin}
        />
      )}
      {step === STEP.review && answers ? (
        <ReportReview
          answers={answers}
          accidentError={detailsError.accident}
          onAccident={(value: AccidentSeen) => {
            setAccident(value);
            setDetailsError((current) => ({ ...current, accident: undefined }));
          }}
          onEdit={(section) => goTo(chatMode ? STEP.issue : EDIT_STEP[section])}
          voiceLanguageCode={convo.lang}
          locationConfirmed={locationConfirmed}
        />
      ) : null}
      <ReportFormFooter
        issueType={issueType}
        photo={photoState.photo}
        lat={pin?.lat ?? ""}
        lng={pin?.lng ?? ""}
        noticedWindow={noticedWindow}
        recurs={recurs}
        accident={accident}
        description={description}
        locationConfirmed={locationConfirmed ? "true" : "false"}
        voiceTranscript={voice.transcript}
        formError={formError}
        showBack={step > 1}
        pending={pending}
        busy={busy}
        chatting={chatting}
        showRecord={step >= STEP.review}
        ready={ready}
        continueLabel={continueLabel}
        onBack={() => goTo(step === STEP.review && chatMode ? STEP.issue : step - 1)}
        onContinue={onContinue}
      />
    </form>
  );
}
