import { redirect } from "next/navigation";

import { login } from "@/app/admin/actions";
import { GovAlert } from "@/components/gov/GovAlert";
import { GovButton } from "@/components/gov/GovButton";
import { GovField } from "@/components/gov/GovField";
import { isAdminAuthed } from "@/lib/admin-auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const metadata = {
  title: "Desk — Kala Ghoda Khabar",
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  if (await isAdminAuthed()) {
    redirect("/admin");
  }

  const { error } = await searchParams;
  const mismatch = error ? "That key did not match." : undefined;

  return (
    <div className="shell max-w-md min-w-0 py-12 sm:py-16">
      <p className="ux4g-card-sub-title">Records desk</p>
      <h1 className="ux4g-heading-xl-strong mt-2">Desk</h1>
      <p className="ux4g-text mt-4">
        Posted reports stay on this desk. Enter the owner key to read and edit
        submitted reports. There is no public moderation queue.
      </p>

      {mismatch ? (
        <GovAlert id="desk-login-error" variant="error" className="mt-6">
          {mismatch}
        </GovAlert>
      ) : null}

      <form action={login} className="mt-8 flex flex-col gap-4">
        <GovField
          id="password"
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={mismatch}
        />
        <GovButton type="submit" className="w-full">
          Open the desk
        </GovButton>
      </form>
    </div>
  );
}
