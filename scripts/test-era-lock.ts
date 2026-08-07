/**
 * Dynasty era locks: Greene stays out of Ruth's league.
 */
import {
  dynastyEraById,
  playerInDynastyEra,
} from "../src/lib/environment";

const pre = dynastyEraById("pre1950");
const modern = dynastyEraById("modern");
const open = dynastyEraById("open");

const ruth = { yearFrom: 1914, yearTo: 1935 };
const greene = { yearFrom: 2022, yearTo: 2025 };
const bonds = { yearFrom: 1986, yearTo: 2007 };
const mays = { yearFrom: 1951, yearTo: 1973 };

const checks = {
  ruthPre: playerInDynastyEra(ruth.yearFrom, ruth.yearTo, pre),
  ruthNotModern: !playerInDynastyEra(ruth.yearFrom, ruth.yearTo, modern),
  greeneModern: playerInDynastyEra(greene.yearFrom, greene.yearTo, modern),
  greeneNotPre: !playerInDynastyEra(greene.yearFrom, greene.yearTo, pre),
  greeneOpen: playerInDynastyEra(greene.yearFrom, greene.yearTo, open),
  maysClassic: playerInDynastyEra(
    mays.yearFrom,
    mays.yearTo,
    dynastyEraById("classic"),
  ),
  bondsFreeagent: playerInDynastyEra(
    bonds.yearFrom,
    bonds.yearTo,
    dynastyEraById("freeagent"),
  ),
  bondsModern: playerInDynastyEra(bonds.yearFrom, bonds.yearTo, modern),
};

const ok = Object.values(checks).every(Boolean);
console.log("era lock checks", checks);
console.log(ok ? "ERA LOCK TESTS PASSED" : "ERA LOCK TESTS FAILED");
if (!ok) process.exit(1);
