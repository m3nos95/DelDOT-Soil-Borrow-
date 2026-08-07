import Link from "next/link";
import { redirect } from "next/navigation";
import { HeroField } from "@/components/HeroField";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/clubhouse");

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0">
        <HeroField />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,13,10,0.25) 0%, rgba(5,13,10,0.08) 38%, rgba(5,13,10,0.62) 72%, rgba(5,13,10,0.96) 100%)",
        }}
      />

      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-end px-5 py-6">
        <Link
          href="/login"
          className="font-[family-name:var(--font-display)] text-sm tracking-[0.16em] text-[var(--fog)] uppercase transition-colors hover:text-[var(--foul)]"
        >
          Log in
        </Link>
      </nav>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pb-16 pt-28 sm:pb-24">
        <h1 className="fade-up pulse-line font-[family-name:var(--font-display)] text-[clamp(5.5rem,20vw,11rem)] leading-[0.8] tracking-[0.02em]">
          HARDBALL
        </h1>
        <p className="fade-up-delay mt-8 max-w-md text-lg leading-relaxed text-[var(--fog)] sm:text-xl">
          Private era leagues. One career card. Draft legends with your crew.
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
    </main>
  );
}
