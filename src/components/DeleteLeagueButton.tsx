"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteLeagueAction } from "@/app/actions/league";

export function DeleteLeagueButton({
  leagueId,
  leagueName,
}: {
  leagueId: string;
  leagueName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn btn-danger !py-1.5 !px-3 !text-xs"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              `Delete “${leagueName}”? This wipes the league, rosters, and games. Cannot be undone.`,
            )
          ) {
            return;
          }
          setError(null);
          start(async () => {
            const res = await deleteLeagueAction(leagueId);
            if (res.error) setError(res.error);
            else {
              router.push("/clubhouse");
              router.refresh();
            }
          });
        }}
      >
        Delete league
      </button>
      {error ? <span className="text-xs text-[#f0a8a8]">{error}</span> : null}
    </div>
  );
}
