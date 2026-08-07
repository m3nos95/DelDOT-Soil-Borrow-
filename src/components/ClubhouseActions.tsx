"use client";

import { useState } from "react";
import { CreateLeagueForm, JoinLeagueForm } from "@/components/LeagueForms";

type Mode = "idle" | "create" | "join";

export function ClubhouseActions({ hasLeagues }: { hasLeagues: boolean }) {
  const [mode, setMode] = useState<Mode>(hasLeagues ? "idle" : "create");

  return (
    <section className="mt-12">
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-3 border-t border-[var(--line)] pt-8">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setMode("create")}
          >
            Create a league
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMode("join")}
          >
            Join with code
          </button>
        </div>
      ) : null}

      {mode === "create" ? (
        <div className="max-w-xl border-t border-[var(--line)] pt-8 fade-up">
          <div className="mb-8 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
                Create a league
              </h2>
              <p className="mt-2 text-sm text-[var(--fog)]">
                Era lock keeps every roster apples-to-apples.
              </p>
            </div>
            {hasLeagues ? (
              <button
                type="button"
                className="shrink-0 font-[family-name:var(--font-display)] text-sm tracking-[0.12em] uppercase text-[var(--fog)] hover:text-[var(--foul)]"
                onClick={() => setMode("idle")}
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className="shrink-0 font-[family-name:var(--font-display)] text-sm tracking-[0.12em] uppercase text-[var(--fog)] hover:text-[var(--foul)]"
                onClick={() => setMode("join")}
              >
                Have a code?
              </button>
            )}
          </div>
          <CreateLeagueForm />
        </div>
      ) : null}

      {mode === "join" ? (
        <div className="max-w-xl border-t border-[var(--line)] pt-8 fade-up">
          <div className="mb-8 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
                Join with code
              </h2>
              <p className="mt-2 text-sm text-[var(--fog)]">
                Claim an open city slot in a friend&apos;s league.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 font-[family-name:var(--font-display)] text-sm tracking-[0.12em] uppercase text-[var(--fog)] hover:text-[var(--foul)]"
              onClick={() => setMode(hasLeagues ? "idle" : "create")}
            >
              {hasLeagues ? "Cancel" : "Create instead"}
            </button>
          </div>
          <JoinLeagueForm />
        </div>
      ) : null}
    </section>
  );
}
