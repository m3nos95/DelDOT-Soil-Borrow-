/**
 * Snake-draft helpers.
 *
 * Round 1 (even): teams 0 → N-1  (slot #1 picks first, #N picks last)
 * Round 2 (odd):  teams N-1 → 0  (slot #N / last rd1 pick goes first)
 * …
 */

export function teamIndexOnClock(pickNumber: number, numTeams: number): number {
  if (numTeams <= 0) return 0;
  const round = Math.floor(pickNumber / numTeams);
  const pos = pickNumber % numTeams;
  return round % 2 === 0 ? pos : numTeams - 1 - pos;
}

export function totalDraftPicks(numTeams: number, rounds: number): number {
  return Math.max(0, numTeams) * Math.max(0, rounds);
}

export function draftRound(pickNumber: number, numTeams: number): number {
  if (numTeams <= 0) return 0;
  return Math.floor(pickNumber / numTeams) + 1;
}

export function isDraftComplete(
  pickNumber: number,
  numTeams: number,
  rounds: number,
): boolean {
  return pickNumber >= totalDraftPicks(numTeams, rounds);
}
