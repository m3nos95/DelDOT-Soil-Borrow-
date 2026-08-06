import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForm";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/clubhouse");

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 diamond-grid opacity-30" />
      <div className="relative w-full max-w-md scoreboard p-8 shadow-2xl">
        <Link
          href="/"
          className="mb-6 block font-[family-name:var(--font-display)] text-4xl tracking-[0.06em]"
        >
          HARDBALL
        </Link>
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Member login
        </h1>
        <p className="mb-8 text-sm text-[var(--fog)]">
          Sign in to your private diamond club.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
