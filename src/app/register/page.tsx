import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForm";
import { getSession } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/clubhouse");

  return (
    <main className="page-shell flex min-h-screen flex-col">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl tracking-[0.1em]"
        >
          HARDBALL
        </Link>
      </nav>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide">
          Join
        </h1>
        <p className="mt-2 mb-10 text-[var(--fog)]">
          Create an account, then start or join an era league.
        </p>
        <RegisterForm />
      </div>
    </main>
  );
}
