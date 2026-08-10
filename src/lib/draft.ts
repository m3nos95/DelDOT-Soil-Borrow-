/**
 * Snake-draft helpers.
 *
 * Round 0: teams 0 → N-1
 * Round 1: teams N-1 → 0
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
