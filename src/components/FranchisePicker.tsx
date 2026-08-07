"use client";

import { useMemo, useState } from "react";
import { FRANCHISES, type Franchise } from "@/lib/franchises";

export function FranchisePicker({
  name = "franchiseCode",
  takenCodes = [],
  defaultCode,
}: {
  name?: string;
  takenCodes?: string[];
  defaultCode?: string;
}) {
  const available = useMemo(
    () => FRANCHISES.filter((f) => !takenCodes.includes(f.code)),
    [takenCodes],
  );
  const initial =
    available.find((f) => f.code === defaultCode)?.code ?? available[0]?.code ?? "";
  const [code, setCode] = useState(initial);
  const selected: Franchise | undefined = FRANCHISES.find((f) => f.code === code);

  const groups = useMemo(() => {
    const order = [
      "AL East",
      "AL Central",
      "AL West",
      "NL East",
      "NL Central",
      "NL West",
    ] as const;
    return order.map((label) => {
      const [league, division] = label.split(" ") as ["AL" | "NL", Franchise["division"]];
      return {
        label,
        teams: available.filter((f) => f.league === league && f.division === division),
      };
    });
  }, [available]);

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label" htmlFor={name}>
          City / club slot
        </label>
        <select
          id={name}
          name={name}
          className="field-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        >
          {groups.map((g) =>
            g.teams.length ? (
              <optgroup key={g.label} label={g.label}>
                {g.teams.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.code} — {f.name}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
      </div>
      {selected ? (
        <p className="text-xs text-[var(--fog)]">
          You&apos;ll be <span className="text-[var(--chalk)]">{selected.name}</span> (
          {selected.code}) · home: {selected.park}. City codes only — no nicknames or
          logos.
        </p>
      ) : (
        <p className="text-sm text-red-300">No city slots left in this league.</p>
      )}
    </div>
  );
}
