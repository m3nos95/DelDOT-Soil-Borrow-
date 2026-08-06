export function formatSalary(amount: number) {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

export function formatRecord(wins: number, losses: number) {
  return `${wins}-${losses}`;
}

export function runDifferential(runsFor: number, runsAgainst: number) {
  const diff = runsFor - runsAgainst;
  return diff > 0 ? `+${diff}` : `${diff}`;
}
