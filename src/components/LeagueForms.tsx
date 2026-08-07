"use client";

import { useActionState, useState } from "react";
import {
  createLeagueAction,
  joinLeagueAction,
  type ActionState,
} from "@/app/actions/league";
import { FranchisePicker } from "@/components/FranchisePicker";
import { DYNASTY_ERAS } from "@/lib/environment";

const initial: ActionState = {};

export function CreateLeagueForm() {
  const [state, action, pending] = useActionState(createLeagueAction, initial);
  const [eraId, setEraId] = useState("modern");
  const era = DYNASTY_ERAS.find((e) => e.id === eraId) ?? DYNASTY_ERAS[3];

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="name">
          League name
        </label>
        <input
          id="name"
          name="name"
          className="field-input"
          required
          placeholder="Thursday Night Hardball"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="era">
          Dynasty era
        </label>
        <select
          id="era"
          name="era"
          className="field-input"
          value={eraId}
          onChange={(e) => setEraId(e.target.value)}
          required
        >
          {DYNASTY_ERAS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
              {e.id === "open" ? " — chaos" : ` (${e.yearFrom}–${e.yearTo})`}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-[var(--fog)]">{era.blurb}</p>
        <p className="mt-1 text-xs text-[var(--fog)]">
          Draft pool is locked to this window so rates stay apples-to-apples.
          Locked at creation — can&apos;t mix Greene and Ruth unless you pick
          All-time.
        </p>
      </div>

      <FranchisePicker />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="maxTeams">
            Max teams
          </label>
          <select
            id="maxTeams"
            name="maxTeams"
            className="field-input"
            defaultValue="6"
          >
            {[2, 4, 6, 8, 10, 12, 14, 16, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="gamesPerTeam">
            Season length
          </label>
          <select
            id="gamesPerTeam"
            name="gamesPerTeam"
            className="field-input"
            defaultValue="20"
          >
            {[10, 20, 40, 60, 100, 162].map((n) => (
              <option key={n} value={n}>
                {n} games
              </option>
            ))}
          </select>
        </div>
      </div>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating…" : "Create league"}
      </button>
    </form>
  );
}

export function JoinLeagueForm({ takenCodes = [] }: { takenCodes?: string[] }) {
  const [state, action, pending] = useActionState(joinLeagueAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="inviteCode">
          Invite code
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          className="field-input font-mono uppercase"
          required
          placeholder="AB12CD"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <FranchisePicker takenCodes={takenCodes} />

      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Joining…" : "Join league"}
      </button>
    </form>
  );
}
