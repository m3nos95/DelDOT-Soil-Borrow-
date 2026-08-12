/**
 * City + league codes only — no club nicknames, no logos.
 * Safe fan-league labels for the current 30-market map.
 */
export type Franchise = {
  code: string;
  city: string;
  league: "AL" | "NL";
  division: "East" | "Central" | "West";
  /** Display name: city + league when a city has two clubs */
  name: string;
  park: string;
};

function f(
  code: string,
  city: string,
  league: "AL" | "NL",
  division: "East" | "Central" | "West",
  park = `${city} Park`,
): Franchise {
  const dualCity = ["New York", "Los Angeles", "Chicago"].includes(city);
  return {
    code,
    city,
    league,
    division,
    name: dualCity ? `${city} ${league}` : city,
    park,
  };
}

export const FRANCHISES: Franchise[] = [
  // AL East
  f("BAL", "Baltimore", "AL", "East"),
  f("BOS", "Boston", "AL", "East"),
  f("NYAL", "New York", "AL", "East"),
  f("TB", "Tampa Bay", "AL", "East"),
  f("TOR", "Toronto", "AL", "East"),
  // AL Central
  f("CHAL", "Chicago", "AL", "Central"),
  f("CLE", "Cleveland", "AL", "Central"),
  f("DET", "Detroit", "AL", "Central"),
  f("KC", "Kansas City", "AL", "Central"),
  f("MIN", "Minnesota", "AL", "Central"),
  // AL West
  f("HOU", "Houston", "AL", "West"),
  f("LAAL", "Los Angeles", "AL", "West"),
  f("OAK", "Oakland", "AL", "West"),
  f("SEA", "Seattle", "AL", "West"),
  f("TEX", "Texas", "AL", "West"),
  // NL East
  f("ATL", "Atlanta", "NL", "East"),
  f("MIA", "Miami", "NL", "East"),
  f("NYNL", "New York", "NL", "East"),
  f("PHI", "Philadelphia", "NL", "East"),
  f("WSH", "Washington", "NL", "East"),
  // NL Central
  f("CHNL", "Chicago", "NL", "Central"),
  f("CIN", "Cincinnati", "NL", "Central"),
  f("MIL", "Milwaukee", "NL", "Central"),
  f("PIT", "Pittsburgh", "NL", "Central"),
  f("STL", "St. Louis", "NL", "Central"),
  // NL West
  f("ARI", "Arizona", "NL", "West"),
  f("COL", "Colorado", "NL", "West"),
  f("LANL", "Los Angeles", "NL", "West"),
  f("SD", "San Diego", "NL", "West"),
  f("SF", "San Francisco", "NL", "West"),
];

export const FRANCHISE_BY_CODE = Object.fromEntries(
  FRANCHISES.map((x) => [x.code, x]),
) as Record<string, Franchise>;

export function getFranchise(code: string): Franchise | undefined {
  return FRANCHISE_BY_CODE[code.trim().toUpperCase()];
}

/** Parks list derived from franchises (city parks, no club marks). */
export const CITY_PARKS = FRANCHISES.map((x) => x.park);
