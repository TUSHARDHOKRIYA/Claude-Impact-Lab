import { GovAlert } from "@/components/gov/GovAlert";
import { GovButton } from "@/components/gov/GovButton";
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
  onBack: () => void;
  onContinue: () => void;
};

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
      {props.formError ? (
        <div className="mt-6">
          <GovAlert variant="error" id={FORM_ALERT_ID} tabIndex={-1}>
            {props.formError}
          </GovAlert>
        </div>
      ) : null}
      <div className={props.showBack ? "rb-actionbar rb-actionbar-split" : "rb-actionbar"}>
        {props.showBack ? (
          <GovButton type="button" variant="secondary" className="w-full" disabled={props.pending} onClick={props.onBack}>
            Back
          </GovButton>
        ) : null}
        {/* Distinct keys: reusing one node let the Continue click submit once React made it type=submit. */}
        {props.chatting ? null : props.showRecord ? (
          <GovButton key="record" type="submit" className="w-full" disabled={props.busy}>
            {props.pending ? "Sending…" : "Send report"}
          </GovButton>
        ) : (
          <GovButton key="continue" type="button" className="w-full" disabled={props.busy} onClick={props.onContinue}>
            Continue
          </GovButton>
        )}
      </div>
    </>
  );
}
