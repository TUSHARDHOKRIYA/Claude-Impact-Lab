import { GovButton } from "@/components/gov/GovButton";

export default function NotFound() {
  return (
    <div className="shell max-w-[46rem] py-20 sm:py-28">
      <h1 className="ux4g-heading-xl-strong">This page does not exist</h1>
      <p className="ux4g-text mt-5">
        Check the address, or start from the ward list.
      </p>
      <p className="mt-9">
        <GovButton href="/wards">Go to the wards</GovButton>
      </p>
    </div>
  );
}
