/**
 * Cap-room guards so a team can always finish the snake draft.
 * Floor salary is $500k (see salaryFromValue).
 */

export const MIN_PLAYER_SALARY = 500_000;
export const MIN_HITTERS_FOR_LINEUP = 9;
export const MIN_PITCHERS_FOR_STAFF = 8; // 5 SP + 3 pen

/** Spots still to fill after the upcoming pick lands. */
export function spotsLeftAfterPick(rosterLen: number, draftRounds: number) {
  return Math.max(0, draftRounds - (rosterLen + 1));
}

/**
 * Max you may spend on the next pick while still being able to fill every
 * remaining draft slot at the league minimum salary.
 */
export function maxAffordableBid(
  payroll: number,
  salaryCap: number,
  rosterLen: number,
  draftRounds: number,
): number {
  const reserve = spotsLeftAfterPick(rosterLen, draftRounds) * MIN_PLAYER_SALARY;
  return salaryCap - payroll - reserve;
}

export function canAffordDraftPick(opts: {
  payroll: number;
  salaryCap: number;
  rosterLen: number;
  draftRounds: number;
  pickSalary: number;
  hitters: number;
  pitchers: number;
  pickingPitcher: boolean;
}): { ok: true } | { ok: false; error: string } {
  const {
    payroll,
    salaryCap,
    rosterLen,
    draftRounds,
    pickSalary,
    hitters,
    pitchers,
    pickingPitcher,
  } = opts;

  if (payroll + pickSalary > salaryCap) {
    return { ok: false, error: "Over the salary cap" };
  }

  const maxBid = maxAffordableBid(payroll, salaryCap, rosterLen, draftRounds);
  if (pickSalary > maxBid) {
    const left = spotsLeftAfterPick(rosterLen, draftRounds);
    return {
      ok: false,
      error:
        left > 0
          ? `Too expensive — leave room for ${left} more pick${left === 1 ? "" : "s"} (max ${formatRough(maxBid)})`
          : "Over the salary cap",
    };
  }

  const hAfter = hitters + (pickingPitcher ? 0 : 1);
  const pAfter = pitchers + (pickingPitcher ? 1 : 0);
  const needH = Math.max(0, MIN_HITTERS_FOR_LINEUP - hAfter);
  const needP = Math.max(0, MIN_PITCHERS_FOR_STAFF - pAfter);
  const spotsLeft = spotsLeftAfterPick(rosterLen, draftRounds);
  if (needH + needP > spotsLeft) {
    if (!pickingPitcher && needP > 0) {
      return {
        ok: false,
        error: `Need pitchers next — still short ${needP} arm${needP === 1 ? "" : "s"} for a 5-man + bullpen`,
      };
    }
    if (pickingPitcher && needH > 0) {
      return {
        ok: false,
        error: `Need hitters next — still short ${needH} for a lineup`,
      };
    }
    return {
      ok: false,
      error: "Not enough remaining picks to finish a legal roster",
    };
  }

  return { ok: true };
}

function formatRough(n: number) {
  if (n < 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n / 1000)}k`;
}
