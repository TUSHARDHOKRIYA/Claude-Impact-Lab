import { GovButton } from "@/components/gov/GovButton";

export default function NotFound() {
  return (
    <div className="shell max-w-[46rem] py-20 sm:py-28">
      <h1 className="ux4g-heading-xl-strong">This street is not on the record</h1>
      <p className="ux4g-text mt-5">
        That page is not part of the Kala Ghoda Khabar archive.
      </p>
      <p className="mt-9">
        <GovButton href="/map">Return to Kala Ghoda records</GovButton>
      </p>
    </div>
  );
}
