"use client";

import { useMemo, useState, useTransition } from "react";
import { saveLineupAction, saveStaffAction } from "@/app/actions/league";

type PlayerOpt = {
  id: string;
  name: string;
  primaryPos: string;
  positions: string;
  isPitcher: boolean;
};

const POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
const STAFF_ROLES = ["SP1", "SP2", "SP3", "SP4", "SP5", "CL", "SU1", "SU2", "LR"];

export function LineupEditor({
  leagueId,
  hitters,
  pitchers,
  initialLineup,
  initialStaff,
}: {
  leagueId: string;
  hitters: PlayerOpt[];
  pitchers: PlayerOpt[];
  initialLineup: { playerId: string; battingOrder: number; position: string }[];
  initialStaff: { playerId: string; role: string }[];
}) {
  const [lineup, setLineup] = useState(() => {
    const map = new Map(initialLineup.map((s) => [s.battingOrder, s]));
    return POSITIONS.map((pos, i) => {
      const order = i + 1;
      return {
        battingOrder: order,
        position: map.get(order)?.position ?? pos,
        playerId: map.get(order)?.playerId ?? hitters[i]?.id ?? "",
      };
    });
  });

  const [staff, setStaff] = useState(() => {
    const map = new Map(initialStaff.map((s) => [s.role, s.playerId]));
    return STAFF_ROLES.map((role, i) => ({
      role,
      playerId: map.get(role) ?? pitchers[i]?.id ?? "",
    }));
  });

  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const usedHitters = useMemo(
    () => new Set(lineup.map((s) => s.playerId).filter(Boolean)),
    [lineup],
  );
  const usedPitchers = useMemo(
    () => new Set(staff.map((s) => s.playerId).filter(Boolean)),
    [staff],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="scoreboard p-6">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Batting order
        </h2>
        <div className="space-y-3">
          {lineup.map((slot, idx) => (
            <div key={slot.battingOrder} className="grid grid-cols-[2rem_5rem_1fr] items-center gap-2">
              <div className="font-mono text-[var(--fog)]">{slot.battingOrder}</div>
              <select
                className="field-input !py-2"
                value={slot.position}
                onChange={(e) => {
                  const next = [...lineup];
                  next[idx] = { ...slot, position: e.target.value };
                  setLineup(next);
                }}
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className="field-input !py-2"
                value={slot.playerId}
                onChange={(e) => {
                  const next = [...lineup];
                  next[idx] = { ...slot, playerId: e.target.value };
                  setLineup(next);
                }}
              >
                <option value="">—</option>
                {hitters.map((h) => (
                  <option
                    key={h.id}
                    value={h.id}
                    disabled={usedHitters.has(h.id) && h.id !== slot.playerId}
                  >
                    {h.name} ({h.primaryPos})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          className="btn btn-primary mt-5"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              setMsg(null);
              const res = await saveLineupAction(leagueId, lineup);
              if (res.error) setError(res.error);
              else setMsg("Lineup saved");
            })
          }
        >
          Save lineup
        </button>
      </section>

      <section className="scoreboard p-6">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Pitching staff
        </h2>
        <p className="mb-4 text-sm text-[var(--fog)]">
          Fill SP1–SP5 (they rotate by game day) plus at least three bullpen
          arms. One ace cannot start every game.
        </p>
        <div className="space-y-3">
          {staff.map((slot, idx) => (
            <div key={slot.role} className="grid grid-cols-[4rem_1fr] items-center gap-2">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--fog)]">
                {slot.role}
              </div>
              <select
                className="field-input !py-2"
                value={slot.playerId}
                onChange={(e) => {
                  const next = [...staff];
                  next[idx] = { ...slot, playerId: e.target.value };
                  setStaff(next);
                }}
              >
                <option value="">—</option>
                {pitchers.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={usedPitchers.has(p.id) && p.id !== slot.playerId}
                  >
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          className="btn btn-primary mt-5"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              setMsg(null);
              const filled = staff.filter((s) => s.playerId);
              const res = await saveStaffAction(leagueId, filled);
              if (res.error) setError(res.error);
              else setMsg("Staff saved");
            })
          }
        >
          Save staff
        </button>
      </section>

      {error ? <p className="text-sm text-red-300 lg:col-span-2">{error}</p> : null}
      {msg ? <p className="text-sm text-[var(--foul)] lg:col-span-2">{msg}</p> : null}
    </div>
  );
}
