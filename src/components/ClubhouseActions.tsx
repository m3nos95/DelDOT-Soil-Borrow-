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
        <div className="max-w-xl border-t border-[var(--line)] pt-8">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
              Create a league
            </h2>
            {hasLeagues ? (
              <button
                type="button"
                className="text-sm text-[var(--fog)] hover:text-[var(--foul)]"
                onClick={() => setMode("idle")}
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className="text-sm text-[var(--fog)] hover:text-[var(--foul)]"
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
        <div className="max-w-xl border-t border-[var(--line)] pt-8">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
              Join with code
            </h2>
            <button
              type="button"
              className="text-sm text-[var(--fog)] hover:text-[var(--foul)]"
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
