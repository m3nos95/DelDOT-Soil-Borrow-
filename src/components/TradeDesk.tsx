"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  proposeTradeAction,
  respondTradeAction,
} from "@/app/actions/league";
import { formatSalary } from "@/lib/format";

type Player = {
  id: string;
  name: string;
  primaryPos: string;
  salary: number;
  careerWAR: number;
  isPitcher: boolean;
};

type TeamOpt = {
  id: string;
  name: string;
  abbreviation: string;
  isCpu: boolean;
  roster: Player[];
};

type TradeRow = {
  id: string;
  status: string;
  note: string;
  proposerTeamId: string;
  partnerTeamId: string;
  proposerAbbr: string;
  partnerAbbr: string;
  giveNames: string[];
  getNames: string[];
  iAmPartner: boolean;
  iAmProposer: boolean;
};

export function TradeDesk({
  leagueId,
  myTeamId,
  teams,
  pending,
  recent,
}: {
  leagueId: string;
  myTeamId: string;
  teams: TeamOpt[];
  pending: TradeRow[];
  recent: TradeRow[];
}) {
  const router = useRouter();
  const others = teams.filter((t) => t.id !== myTeamId);
  const mine = teams.find((t) => t.id === myTeamId);
  const [partnerId, setPartnerId] = useState(others[0]?.id ?? "");
  const [give, setGive] = useState<string[]>([]);
  const [get, setGet] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const partner = useMemo(
    () => others.find((t) => t.id === partnerId),
    [others, partnerId],
  );

  function toggle(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function propose() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await proposeTradeAction(leagueId, partnerId, give, get);
      if (res.error) setError(res.error);
      else {
        setMessage(res.message ?? "Sent");
        setGive([]);
        setGet([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-10">
      {pending.length ? (
        <section className="panel">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
            Pending
          </h2>
          <div className="space-y-4">
            {pending.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-end sm:justify-between"
              >
                <div>
                  <div className="font-[family-name:var(--font-display)] text-xl tracking-wide">
                    {t.proposerAbbr} ⇄ {t.partnerAbbr}
                  </div>
                  <p className="mt-1 text-sm text-[var(--fog)]">
                    You{" "}
                    {t.iAmProposer ? "give" : "get"}:{" "}
                    {(t.iAmProposer ? t.giveNames : t.getNames).join(", ") ||
                      "—"}
                    {" · "}
                    You{" "}
                    {t.iAmProposer ? "get" : "give"}:{" "}
                    {(t.iAmProposer ? t.getNames : t.giveNames).join(", ") ||
                      "—"}
                  </p>
                  {t.note ? (
                    <p className="mt-1 text-xs text-[var(--fog)]">{t.note}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {t.iAmPartner ? (
                    <>
                      <button
                        className="btn btn-primary !py-2 !px-3 !text-sm"
                        disabled={busy}
                        onClick={() =>
                          start(async () => {
                            const res = await respondTradeAction(
                              leagueId,
                              t.id,
                              true,
                            );
                            if (res.error) setError(res.error);
                            router.refresh();
                          })
                        }
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-ghost !py-2 !px-3 !text-sm"
                        disabled={busy}
                        onClick={() =>
                          start(async () => {
                            await respondTradeAction(leagueId, t.id, false);
                            router.refresh();
                          })
                        }
                      >
                        Reject
                      </button>
                    </>
                  ) : t.iAmProposer ? (
                    <button
                      className="btn btn-ghost !py-2 !px-3 !text-sm"
                      disabled={busy}
                      onClick={() =>
                        start(async () => {
                          await respondTradeAction(leagueId, t.id, false);
                          router.refresh();
                        })
                      }
                    >
                      Withdraw
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Propose a trade
        </h2>
        <p className="mb-6 max-w-xl text-sm text-[var(--fog)]">
          CPU partners only accept fair, needs-aware deals — no star dumps for
          scraps.
        </p>

        <label className="field-label" htmlFor="partner">
          Trade with
        </label>
        <select
          id="partner"
          className="field-input mb-6 max-w-md"
          value={partnerId}
          onChange={(e) => {
            setPartnerId(e.target.value);
            setGet([]);
          }}
        >
          {others.map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbreviation} — {t.name}
              {t.isCpu ? " (CPU)" : ""}
            </option>
          ))}
        </select>

        <div className="grid gap-8 lg:grid-cols-2">
          <PlayerPickList
            title="You give"
            players={mine?.roster ?? []}
            selected={give}
            onToggle={(id) => toggle(give, id, setGive)}
          />
          <PlayerPickList
            title="You get"
            players={partner?.roster ?? []}
            selected={get}
            onToggle={(id) => toggle(get, id, setGet)}
          />
        </div>

        {error ? <p className="mt-4 text-sm text-[#f0a8a8]">{error}</p> : null}
        {message ? (
          <p className="mt-4 text-sm text-[var(--foul)]">{message}</p>
        ) : null}

        <button
          className="btn btn-primary mt-6"
          disabled={busy || (!give.length && !get.length) || !partnerId}
          onClick={propose}
        >
          {busy ? "Sending…" : "Send offer"}
        </button>
      </section>

      {recent.length ? (
        <section className="panel">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
            Recent
          </h2>
          <ul className="space-y-3 text-sm text-[var(--fog)]">
            {recent.map((t) => (
              <li key={t.id}>
                <span className="text-[var(--chalk)]">
                  {t.proposerAbbr} ⇄ {t.partnerAbbr}
                </span>
                {" · "}
                {t.status}
                {" · "}
                {t.giveNames.join(", ") || "—"} for{" "}
                {t.getNames.join(", ") || "—"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PlayerPickList({
  title,
  players,
  selected,
  onToggle,
}: {
  title: string;
  players: Player[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl tracking-wide">
        {title}
      </h3>
      <div className="max-h-80 space-y-1 overflow-y-auto border-t border-[var(--line)] pt-2">
        {players
          .slice()
          .sort((a, b) => b.careerWAR - a.careerWAR)
          .map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggle(p.id)}
                className="flex w-full items-baseline justify-between gap-3 border-b border-[var(--line)] py-2 text-left transition-colors hover:text-[var(--foul)]"
                style={{ color: on ? "var(--foul)" : undefined }}
              >
                <span>
                  <span className="font-[family-name:var(--font-display)] text-lg tracking-wide">
                    {p.name}
                  </span>
                  <span className="ml-2 text-xs text-[var(--fog)]">
                    {p.primaryPos}
                  </span>
                </span>
                <span className="stat-mono shrink-0 text-xs text-[var(--fog)]">
                  {p.careerWAR.toFixed(1)} · {formatSalary(p.salary)}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
