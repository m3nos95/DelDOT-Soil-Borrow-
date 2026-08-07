"use client";

import { useActionState } from "react";
import {
  createLeagueAction,
  joinLeagueAction,
  type ActionState,
} from "@/app/actions/league";
import { FranchisePicker } from "@/components/FranchisePicker";

const initial: ActionState = {};

export function CreateLeagueForm() {
  const [state, action, pending] = useActionState(createLeagueAction, initial);
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
