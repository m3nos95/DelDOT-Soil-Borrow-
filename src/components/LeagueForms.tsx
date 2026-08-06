"use client";

import { useActionState } from "react";
import {
  createLeagueAction,
  joinLeagueAction,
  type ActionState,
} from "@/app/actions/league";
import { PARKS } from "@/lib/constants";

const initial: ActionState = {};

export function CreateLeagueForm() {
  const [state, action, pending] = useActionState(createLeagueAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="name">
          League name
        </label>
        <input id="name" name="name" className="field-input" required placeholder="Thursday Night Hardball" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="teamName">
            Your team
          </label>
          <input id="teamName" name="teamName" className="field-input" required />
        </div>
        <div>
          <label className="field-label" htmlFor="abbreviation">
            Abbr
          </label>
          <input
            id="abbreviation"
            name="abbreviation"
            className="field-input uppercase"
            maxLength={4}
            required
            placeholder="NYY"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="park">
            Home park
          </label>
          <select id="park" name="park" className="field-input">
            {PARKS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="maxTeams">
            Max teams
          </label>
          <select id="maxTeams" name="maxTeams" className="field-input" defaultValue="4">
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="gamesPerTeam">
          Season length (games / team)
        </label>
        <select id="gamesPerTeam" name="gamesPerTeam" className="field-input" defaultValue="20">
          {[10, 20, 40, 60].map((n) => (
            <option key={n} value={n}>
              {n} games
            </option>
          ))}
        </select>
      </div>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating…" : "Create league"}
      </button>
    </form>
  );
}

export function JoinLeagueForm() {
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="teamName">
            Your team
          </label>
          <input id="teamName" name="teamName" className="field-input" required />
        </div>
        <div>
          <label className="field-label" htmlFor="abbreviation">
            Abbr
          </label>
          <input
            id="abbreviation"
            name="abbreviation"
            className="field-input uppercase"
            maxLength={4}
            required
          />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="park">
          Home park
        </label>
        <select id="park" name="park" className="field-input">
          {PARKS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Joining…" : "Join league"}
      </button>
    </form>
  );
}
