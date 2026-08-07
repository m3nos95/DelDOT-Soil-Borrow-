import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForm";
import { HeroField } from "@/components/HeroField";
import { getSession } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/clubhouse");

  return (
    <main className="auth-shell">
      <div className="auth-field">
        <HeroField />
      </div>
      <div className="auth-veil" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <nav className="flex items-center justify-between">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl tracking-[0.1em] transition-colors hover:text-[var(--foul)]"
          >
            HARDBALL
          </Link>
        </nav>

        <div className="flex flex-1 items-center py-12">
          <div className="auth-panel fade-up">
            <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
              Join
            </h1>
            <p className="mt-3 mb-10 max-w-sm text-[var(--fog)] leading-relaxed">
              Create an account, then start or join an era league.
            </p>
            <RegisterForm />
          </div>
        </div>
      </div>
    </main>
  );
}
