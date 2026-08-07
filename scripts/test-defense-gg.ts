import { deriveDefense } from "../src/lib/sim";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const brooks = deriveDefense({
  primaryPos: "3B",
  careerWAR: 80.2,
  goldGloves: 16,
});
const santo = deriveDefense({
  primaryPos: "3B",
  careerWAR: 70.9,
  goldGloves: 5,
});
const preAward = deriveDefense({
  primaryPos: "SS",
  careerWAR: 80,
  goldGloves: 0,
});

assert(brooks > santo + 12, `Brooks (${brooks}) should crush Santo (${santo})`);
assert(brooks >= 85, `Brooks elite glove expected, got ${brooks}`);
assert(preAward > 60, `Pre-1957 stars still get position/WAR glove, got ${preAward}`);

console.log("DEFENSE GG OK", { brooks, santo, delta: brooks - santo, preAward });
