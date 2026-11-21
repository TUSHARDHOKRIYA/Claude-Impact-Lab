import { GovAlert } from "@/components/gov/GovAlert";
import { ArrowLeftIcon } from "@/components/report/flow-icons";
import { FORM_ALERT_ID } from "@/components/report/report-form-helpers";

type ReportFormFooterProps = {
  issueType: string;
  photo: string;
  lat: string | number;
  lng: string | number;
  noticedWindow: string;
  recurs: string;
  accident: string;
  description: string;
  locationConfirmed: string;
  voiceTranscript: string;
  formError: string | null;
  showBack: boolean;
  pending: boolean;
  busy: boolean;
  chatting: boolean;
  showRecord: boolean;
  /** The current screen has its answer, so the main button reads as ready. */
  ready: boolean;
  continueLabel: string;
  onBack: () => void;
  onContinue: () => void;
};

/** A round back button and one wide pill, pinned to the bottom within thumb reach. */
export function ReportFormFooter(props: ReportFormFooterProps) {
  return (
    <>
      <input type="hidden" name="issueType" value={props.issueType} />
      <input type="hidden" name="photo" value={props.photo} />
      <input type="hidden" name="lat" value={props.lat} />
      <input type="hidden" name="lng" value={props.lng} />
      <input type="hidden" name="noticedWindow" value={props.noticedWindow} />
      <input type="hidden" name="recurs" value={props.recurs} />
      <input type="hidden" name="accident" value={props.accident} />
      <input type="hidden" name="description" value={props.description} />
      <input type="hidden" name="locationConfirmed" value={props.locationConfirmed} />
      <input type="hidden" name="voiceTranscript" value={props.voiceTranscript} />
      {/* Spam honeypot: hidden from humans and screen readers; bots that auto-fill it are rejected server-side. */}
      <input
        type="text"
        name="website"
        defaultValue=""
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />
      {props.formError ? (
        <div className="ux4g-mt-l">
          <GovAlert variant="error" id={FORM_ALERT_ID} tabIndex={-1}>
            {props.formError}
          </GovAlert>
        </div>
      ) : null}
      <div className="rb-actionbar">
        {props.showBack ? (
          <button
            type="button"
            className="rb-back touch-target"
            aria-label="Back"
            disabled={props.pending}
            onClick={props.onBack}
          >
            <ArrowLeftIcon size={22} />
          </button>
        ) : null}
        {/* Distinct keys: reusing one node let the Continue click submit once React made it type=submit. */}
        {props.chatting ? null : props.showRecord ? (
          <button key="record" type="submit" className="rb-forward touch-target" disabled={props.busy}>
            {props.pending ? "Sending…" : "Send report"}
          </button>
        ) : (
          <button
            key="continue"
            type="button"
            className="rb-forward touch-target"
            data-ready={props.ready ? "true" : "false"}
            disabled={props.busy}
            onClick={props.onContinue}
          >
            {props.continueLabel}
          </button>
        )}
      </div>
    </>
  );
}
