import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/clubhouse");

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 diamond-grid opacity-40" />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(26,74,50,0.55), transparent 60%), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <div className="font-[family-name:var(--font-display)] text-2xl tracking-[0.08em]">
          HARDBALL
        </div>
        <div className="flex gap-2">
          <Link href="/login" className="btn btn-ghost !py-2 !px-4 !text-sm">
            Log in
          </Link>
          <Link href="/register" className="btn btn-primary !py-2 !px-4 !text-sm">
            Join
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-20 pt-10">
        <p className="fade-up mb-4 text-xs uppercase tracking-[0.35em] text-[var(--foul)]">
          For you and your friends
        </p>
        <h1 className="fade-up pulse-line font-[family-name:var(--font-display)] text-[clamp(4.5rem,16vw,9.5rem)] leading-[0.85] tracking-[0.02em]">
          HARDBALL
        </h1>
        <p className="fade-up-delay mt-8 max-w-xl text-lg text-[var(--fog)] sm:text-xl">
          Private historical fantasy baseball. Every career, one card — draft
          Ruth once, not Ruth 1927. Set your lineup and sim with your crew.
        </p>
        <div className="fade-up-delay-2 mt-10 flex flex-wrap gap-3">
          <Link href="/register" className="btn btn-primary">
            Start a league
          </Link>
          <Link href="/login" className="btn btn-ghost">
            Member login
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--line)] px-4 py-4 text-center text-xs uppercase tracking-[0.2em] text-[var(--fog)]">
        Draft · Manage · Sim · Argue
      </footer>
    </main>
  );
}
