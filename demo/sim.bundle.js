"use strict";
var HardballSim = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/lib/sim.ts
  var sim_exports = {};
  __export(sim_exports, {
    DYNASTY_ERAS: () => DYNASTY_ERAS,
    DYNASTY_ERA_BY_ID: () => DYNASTY_ERA_BY_ID,
    ERAS: () => ERAS,
    NEUTRAL_PARK: () => NEUTRAL_PARK,
    PARK_BY_CODE: () => PARK_BY_CODE,
    batterHandVs: () => batterHandVs,
    buildPitchSequence: () => buildPitchSequence,
    deriveDefense: () => deriveDefense,
    deriveSpeed: () => deriveSpeed,
    dynastyEraById: () => dynastyEraById,
    dynastyEraPlayerWhere: () => dynastyEraPlayerWhere,
    eraById: () => eraById,
    eraOverlapYears: () => eraOverlapYears,
    formatIp: () => formatIp,
    lineupDefense: () => lineupDefense,
    parkForCode: () => parkForCode,
    platoonOffenseFactor: () => platoonOffenseFactor,
    playerInDynastyEra: () => playerInDynastyEra,
    simulateGame: () => simulateGame
  });

  // src/lib/environment.ts
  var PARK_BY_CODE = {
    BAL: { code: "BAL", name: "Baltimore Park", run: 1.04, hr: 1.1, hit: 1.02 },
    BOS: { code: "BOS", name: "Boston Park", run: 1.08, hr: 1.06, hit: 1.07 },
    NYAL: { code: "NYAL", name: "New York AL Park", run: 1.05, hr: 1.18, hit: 1.01 },
    TB: { code: "TB", name: "Tampa Bay Park", run: 0.96, hr: 0.95, hit: 0.97 },
    TOR: { code: "TOR", name: "Toronto Park", run: 1.03, hr: 1.12, hit: 1 },
    CHAL: { code: "CHAL", name: "Chicago AL Park", run: 0.98, hr: 1.08, hit: 0.97 },
    CLE: { code: "CLE", name: "Cleveland Park", run: 1, hr: 1.02, hit: 1 },
    DET: { code: "DET", name: "Detroit Park", run: 1.02, hr: 1.05, hit: 1.01 },
    KC: { code: "KC", name: "Kansas City Park", run: 1.01, hr: 0.92, hit: 1.03 },
    MIN: { code: "MIN", name: "Minnesota Park", run: 1.02, hr: 1.04, hit: 1.01 },
    HOU: { code: "HOU", name: "Houston Park", run: 0.97, hr: 1.08, hit: 0.96 },
    LAAL: { code: "LAAL", name: "Los Angeles AL Park", run: 0.96, hr: 0.98, hit: 0.97 },
    OAK: { code: "OAK", name: "Oakland Park", run: 0.94, hr: 0.9, hit: 0.96 },
    SEA: { code: "SEA", name: "Seattle Park", run: 0.93, hr: 0.92, hit: 0.95 },
    TEX: { code: "TEX", name: "Texas Park", run: 1.1, hr: 1.2, hit: 1.04 },
    ATL: { code: "ATL", name: "Atlanta Park", run: 1.02, hr: 1.08, hit: 1 },
    MIA: { code: "MIA", name: "Miami Park", run: 0.95, hr: 0.88, hit: 0.97 },
    NYNL: { code: "NYNL", name: "New York NL Park", run: 0.97, hr: 1.05, hit: 0.96 },
    PHI: { code: "PHI", name: "Philadelphia Park", run: 1.04, hr: 1.14, hit: 1.01 },
    WSH: { code: "WSH", name: "Washington Park", run: 1.01, hr: 1.06, hit: 1 },
    CHNL: { code: "CHNL", name: "Chicago NL Park", run: 1.06, hr: 1.12, hit: 1.03 },
    CIN: { code: "CIN", name: "Cincinnati Park", run: 1.08, hr: 1.22, hit: 1.02 },
    MIL: { code: "MIL", name: "Milwaukee Park", run: 1.03, hr: 1.1, hit: 1.01 },
    PIT: { code: "PIT", name: "Pittsburgh Park", run: 0.97, hr: 0.9, hit: 0.99 },
    STL: { code: "STL", name: "St. Louis Park", run: 0.98, hr: 0.94, hit: 0.99 },
    ARI: { code: "ARI", name: "Arizona Park", run: 1.07, hr: 1.16, hit: 1.04 },
    COL: { code: "COL", name: "Colorado Park", run: 1.32, hr: 1.38, hit: 1.18 },
    LANL: { code: "LANL", name: "Los Angeles NL Park", run: 0.94, hr: 1.02, hit: 0.94 },
    SD: { code: "SD", name: "San Diego Park", run: 0.9, hr: 0.82, hit: 0.93 },
    SF: { code: "SF", name: "San Francisco Park", run: 0.89, hr: 0.78, hit: 0.94 }
  };
  var NEUTRAL_PARK = {
    code: "GEN",
    name: "Neutral Park",
    run: 1,
    hr: 1,
    hit: 1
  };
  function parkForCode(code) {
    var _a;
    if (!code) return NEUTRAL_PARK;
    return (_a = PARK_BY_CODE[code.trim().toUpperCase()]) != null ? _a : NEUTRAL_PARK;
  }
  var ERAS = {
    neutral: {
      id: "neutral",
      label: "Neutral (career rates)",
      k: 1,
      bb: 1,
      hr: 1,
      babip: 1
    },
    deadball: {
      id: "deadball",
      label: "Dead ball",
      k: 0.55,
      bb: 0.85,
      hr: 0.4,
      babip: 1.08
    },
    liveball: {
      id: "liveball",
      label: "Live ball",
      k: 0.72,
      bb: 0.95,
      hr: 0.85,
      babip: 1.04
    },
    expansion: {
      id: "expansion",
      label: "Expansion era",
      k: 0.95,
      bb: 1.02,
      hr: 1,
      babip: 1
    },
    steroid: {
      id: "steroid",
      label: "High-offense era",
      k: 1.05,
      bb: 1.05,
      hr: 1.28,
      babip: 1.02
    },
    modern: {
      id: "modern",
      label: "Modern K era",
      k: 1.22,
      bb: 1.04,
      hr: 1.12,
      babip: 0.96
    }
  };
  function eraById(id) {
    var _a;
    if (!id) return ERAS.neutral;
    return (_a = ERAS[id]) != null ? _a : ERAS.neutral;
  }
  var DYNASTY_ERAS = [
    {
      id: "pre1950",
      label: "Pre-1950",
      blurb: "Dead ball through WWII \u2014 Ruth, Gehrig, Hornsby, Grove",
      yearFrom: 1871,
      yearTo: 1949,
      minOverlap: 3,
      climateId: "neutral"
    },
    {
      id: "classic",
      label: "1950\u20131979",
      blurb: "Integration through the 70s \u2014 Mays, Aaron, Koufax, Seaver",
      yearFrom: 1950,
      yearTo: 1979,
      minOverlap: 3,
      climateId: "neutral"
    },
    {
      id: "freeagent",
      label: "1980\u20131999",
      blurb: "Free agency & power boom \u2014 Rickey, Bonds peak start, Maddux",
      yearFrom: 1980,
      yearTo: 1999,
      minOverlap: 3,
      climateId: "neutral"
    },
    {
      id: "modern",
      label: "2000\u2013now",
      blurb: "Moneyball through the K era \u2014 Pujols, Trout, Verlander, Greene",
      yearFrom: 2e3,
      yearTo: 2025,
      minOverlap: 3,
      climateId: "neutral"
    },
    {
      id: "open",
      label: "All-time (chaos)",
      blurb: "Every career card. Yes, Greene can K Ruth. You asked for it.",
      yearFrom: 1871,
      yearTo: 2025,
      minOverlap: 1,
      climateId: "neutral"
    }
  ];
  var DYNASTY_ERA_BY_ID = Object.fromEntries(
    DYNASTY_ERAS.map((e) => [e.id, e])
  );
  function dynastyEraById(id) {
    var _a;
    if (!id) return DYNASTY_ERA_BY_ID.modern;
    return (_a = DYNASTY_ERA_BY_ID[id]) != null ? _a : DYNASTY_ERA_BY_ID.modern;
  }
  function eraOverlapYears(yearFrom, yearTo, era) {
    const start = Math.max(yearFrom, era.yearFrom);
    const end = Math.min(yearTo, era.yearTo);
    return Math.max(0, end - start + 1);
  }
  function playerInDynastyEra(yearFrom, yearTo, era) {
    return eraOverlapYears(yearFrom, yearTo, era) >= era.minOverlap;
  }
  function dynastyEraPlayerWhere(era) {
    const pad = Math.max(0, era.minOverlap - 1);
    return {
      yearFrom: { lte: era.yearTo - pad },
      yearTo: { gte: era.yearFrom + pad }
    };
  }

  // src/lib/sim.ts
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 1831565813;
      let r = Math.imul(t ^ t >>> 15, 1 | t);
      r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }
  var PITCH_BASE_VELO = {
    FF: 94,
    SI: 93,
    SL: 85,
    CH: 84,
    CB: 79
  };
  function choosePitch(pitcher, prand) {
    var _a;
    const stuff = (_a = pitcher.stuff) != null ? _a : 50;
    const r = prand();
    let type;
    if (r < 0.52) type = prand() < 0.18 ? "SI" : "FF";
    else if (r < 0.74) type = "SL";
    else if (r < 0.9) type = "CH";
    else type = "CB";
    const velo = Math.round(
      PITCH_BASE_VELO[type] + (stuff - 50) * 0.12 + (prand() - 0.5) * 3
    );
    return { type, velo };
  }
  function pitchLocation(result, prand) {
    const edge = () => (prand() - 0.5) * 2;
    const outAxis = () => (prand() < 0.5 ? -1 : 1) * (1.1 + prand() * 0.6);
    switch (result) {
      case "called":
        return { x: edge() * 0.85, y: edge() * 0.85 };
      case "swinging":
        if (prand() < 0.6) {
          return {
            x: (prand() < 0.5 ? -1 : 1) * (0.7 + prand() * 0.5),
            y: -Math.abs(edge()) * 1.1 - 0.15
          };
        }
        return { x: edge() * 0.9, y: edge() * 0.9 };
      case "foul":
        return { x: edge() * 1, y: edge() * 1 };
      case "inplay":
        return { x: edge() * 0.7, y: edge() * 0.7 };
      case "hbp":
        return { x: -1.5 - prand() * 0.3, y: -0.3 - prand() * 0.6 };
      case "ball":
      default:
        return prand() < 0.5 ? { x: outAxis(), y: edge() * 1.1 } : { x: edge() * 1.1, y: outAxis() };
    }
  }
  function weightedInt(weights, prand) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = prand() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return weights.length - 1;
  }
  function buildPitchSequence(outcome, pitcher, prand) {
    const pitches = [];
    let balls = 0;
    let strikes = 0;
    if (outcome === "K") {
      balls = weightedInt([0.34, 0.3, 0.22, 0.14], prand);
      strikes = 2;
    } else if (outcome === "BB") {
      strikes = weightedInt([0.3, 0.35, 0.35], prand);
      balls = 3;
    } else if (outcome === "HBP") {
      balls = weightedInt([0.5, 0.3, 0.2], prand);
      strikes = weightedInt([0.5, 0.3, 0.2], prand);
    } else {
      balls = weightedInt([0.4, 0.3, 0.2, 0.1], prand);
      strikes = weightedInt([0.42, 0.34, 0.24], prand);
    }
    const setup = [
      ...Array(balls).fill("B"),
      ...Array(strikes).fill("S")
    ];
    for (let i = setup.length - 1; i > 0; i--) {
      const j = Math.floor(prand() * (i + 1));
      [setup[i], setup[j]] = [setup[j], setup[i]];
    }
    let curB = 0;
    let curS = 0;
    const push = (result) => {
      const { type, velo } = choosePitch(pitcher, prand);
      const loc = pitchLocation(result, prand);
      pitches.push({ type, velo, x: loc.x, y: loc.y, result, balls: curB, strikes: curS });
    };
    for (const s of setup) {
      if (s === "B") {
        push("ball");
        curB += 1;
      } else {
        const rr = prand();
        const res = rr < 0.24 ? "foul" : rr < 0.62 ? "swinging" : "called";
        push(res);
        curS = Math.min(2, curS + 1);
      }
    }
    if (curS === 2 && outcome !== "BB") {
      const extraFouls = weightedInt([0.55, 0.25, 0.13, 0.07], prand);
      for (let i = 0; i < extraFouls; i++) push("foul");
    }
    if (outcome === "K") {
      push(prand() < 0.66 ? "swinging" : "called");
    } else if (outcome === "BB") {
      push("ball");
    } else if (outcome === "HBP") {
      push("hbp");
    } else {
      push("inplay");
    }
    return pitches;
  }
  function deriveSpeed(p) {
    if (p.isPitcher) return 30;
    return clamp(28 + p.tripleRate * 3.2 - p.hrRate * 0.15, 20, 96);
  }
  function deriveDefense(p) {
    var _a, _b;
    const gg = Math.max(0, (_a = p.goldGloves) != null ? _a : 0);
    if (p.isPitcher) {
      return clamp(40 + Math.min(18, gg * 1.1), 35, 70);
    }
    const base = {
      C: 56,
      SS: 64,
      CF: 62,
      "2B": 58,
      "3B": 54,
      LF: 48,
      RF: 48,
      OF: 52,
      "1B": 40,
      DH: 28,
      UTIL: 50,
      P: 40
    };
    let d = (_b = base[p.primaryPos]) != null ? _b : 50;
    if (p.careerWAR != null) {
      d += clamp((p.careerWAR - 25) * 0.1, -6, 8);
    }
    let ggBonus = 0;
    for (let i = 1; i <= gg; i++) {
      if (i <= 5) ggBonus += 2.4;
      else if (i <= 10) ggBonus += 1.6;
      else ggBonus += 1;
    }
    d += Math.min(30, ggBonus);
    return clamp(d, 20, 96);
  }
  function lineupDefense(lineup) {
    const fielders = lineup.filter((e) => e.position !== "DH");
    if (fielders.length === 0) return 50;
    const sum = fielders.reduce((s, e) => {
      var _a;
      return s + ((_a = e.player.defense) != null ? _a : 50);
    }, 0);
    return sum / fielders.length;
  }
  function emptyBatter(p) {
    return {
      playerId: p.id,
      name: p.name,
      ab: 0,
      r: 0,
      h: 0,
      rbi: 0,
      bb: 0,
      so: 0,
      hr: 0,
      sb: 0,
      doubles: 0,
      triples: 0,
      hbp: 0,
      sf: 0
    };
  }
  function emptyPitcher(p) {
    return {
      playerId: p.id,
      name: p.name,
      ip: 0,
      h: 0,
      r: 0,
      er: 0,
      bb: 0,
      so: 0,
      hr: 0,
      decision: "",
      qs: 0,
      cg: 0,
      sho: 0
    };
  }
  function batterHandVs(batter, pitcher) {
    if (batter.bats === "S") return pitcher.throws === "L" ? "R" : "L";
    if (batter.bats === "L" || batter.bats === "R") return batter.bats;
    return "R";
  }
  function platoonOffenseFactor(batter, pitcher) {
    const hand = batterHandVs(batter, pitcher);
    const sameSide = hand === pitcher.throws;
    const stuff = pitcher.stuff;
    if (!sameSide) {
      return clamp(1.06 + (55 - stuff) * 15e-4, 1.02, 1.14);
    }
    if (hand === "L" && pitcher.throws === "L") {
      const crush = 0.78 - (stuff - 50) * 45e-4;
      return clamp(crush, 0.55, 0.92);
    }
    return clamp(0.9 - (stuff - 50) * 2e-3, 0.78, 0.96);
  }
  function fatigueFactor(arm) {
    if (arm.role === "SP") {
      const budget = 18 + arm.player.durability / 100 * 16;
      const over2 = Math.max(0, arm.bf - budget * 0.72);
      return 1 + over2 * 0.035 + (arm.tired ? 0.12 : 0);
    }
    const softCap = arm.role === "CL" ? 5 : arm.role === "SU" ? 6 : 9;
    const over = Math.max(0, arm.bf - softCap);
    return 1 + over * 0.06;
  }
  function resolvePa(batter, arm, bases, outs, rand, climate) {
    const pitcher = arm.player;
    const platoon = platoonOffenseFactor(batter, pitcher);
    const fatigue = fatigueFactor(arm);
    const stuffMod = (pitcher.stuff - 50) / 100;
    const controlMod = (pitcher.control - 50) / 100;
    const { park, era } = climate;
    const glove = 1 - (climate.defense - 50) / 220;
    const hfa = climate.homeBat ? 1.03 : 1;
    let k = batter.kRate * (1 + stuffMod * 0.6) * (2 - platoon) * (1.05 - (fatigue - 1) * 0.35) * era.k;
    let bb = batter.bbRate * (1 - controlMod * 0.65) * platoon * (0.95 + (fatigue - 1) * 0.4) * era.bb * hfa;
    let hbp = batter.hbpRate * (1 + (fatigue - 1) * 0.2);
    let single = batter.singleRate * (1 - stuffMod * 0.22) * platoon * fatigue * park.hit * era.babip * glove * hfa * park.run;
    let double = batter.doubleRate * (1 - stuffMod * 0.18) * platoon * fatigue * park.hit * era.babip * glove * hfa * park.run;
    let triple = batter.tripleRate * platoon * park.hit * era.babip * glove * park.run;
    let hr = batter.hrRate * (1 - stuffMod * 0.32) * platoon * (0.9 + (fatigue - 1) * 0.5) * park.hr * era.hr * hfa * Math.sqrt(park.run);
    const risp = Boolean(bases[1] || bases[2]);
    if (risp) {
      const contactSkill = clamp(1 - batter.kRate / 320, 0.2, 1);
      k *= 1.08 - contactSkill * 0.05;
      single *= 0.88 + contactSkill * 0.28;
      double *= 0.9 + contactSkill * 0.25;
      hr *= 0.92 + contactSkill * 0.2;
    }
    k = clamp(k, 60, 450);
    bb = clamp(bb, 25, 240);
    hbp = clamp(hbp, 1, 35);
    single = clamp(single, 50, 280);
    double = clamp(double, 12, 110);
    triple = clamp(triple, 1, 32);
    hr = clamp(hr, 2, 145);
    const contact = single + double + triple + hr;
    const nonOut = k + bb + hbp + contact;
    let out = Math.max(200, 1e3 - nonOut);
    out *= clamp(1 + (climate.defense - 50) / 180, 0.85, 1.2);
    let gidp = 0;
    if (bases[0] && !bases[1] && outs < 2) {
      const slow = (100 - batter.speed) / 100;
      const dpGlove = clamp(1 + (climate.defense - 50) / 140, 0.85, 1.25);
      gidp = clamp(18 + slow * 55 + batter.hrRate * 0.08, 10, 90) * dpGlove;
      out = Math.max(120, out - gidp);
    }
    const total = k + bb + hbp + single + double + triple + hr + out + gidp;
    const roll = rand() * total;
    let acc = 0;
    const table = [
      ["K", k],
      ["BB", bb],
      ["HBP", hbp],
      ["1B", single],
      ["2B", double],
      ["3B", triple],
      ["HR", hr],
      ["GIDP", gidp],
      ["OUT", out]
    ];
    for (const [outcome, weight] of table) {
      acc += weight;
      if (roll < acc) return outcome;
    }
    return "OUT";
  }
  function advanceOnHit(bases, batter, hit, rand) {
    if (hit >= 4) {
      const scored2 = [
        ...bases[2] ? [bases[2].player] : [],
        ...bases[1] ? [bases[1].player] : [],
        ...bases[0] ? [bases[0].player] : [],
        batter
      ];
      return { scored: scored2, bases: [null, null, null], note: "" };
    }
    const scored = [];
    const next = [null, null, null];
    const bits = [];
    const spd = (p) => p.speed;
    if (hit === 3) {
      for (const occ of bases) {
        if (occ) scored.push(occ.player);
      }
      next[2] = { player: batter };
      return { scored, bases: next, note: "" };
    }
    if (hit === 2) {
      if (bases[2]) scored.push(bases[2].player);
      if (bases[1]) scored.push(bases[1].player);
      if (bases[0]) {
        const r = bases[0].player;
        const pScore = clamp(0.28 + (spd(r) - 50) * 7e-3, 0.18, 0.78);
        if (rand() < pScore) {
          scored.push(r);
          bits.push(`${r.name} scores from first`);
        } else {
          next[2] = { player: r };
        }
      }
      next[1] = { player: batter };
      return { scored, bases: next, note: bits.join("; ") };
    }
    if (bases[2]) {
      const pScore = clamp(0.88 + (spd(bases[2].player) - 40) * 2e-3, 0.75, 0.98);
      if (rand() < pScore) scored.push(bases[2].player);
      else next[2] = bases[2];
    }
    if (bases[1]) {
      const r = bases[1].player;
      const pScore = clamp(0.38 + (spd(r) - 50) * 8e-3, 0.22, 0.82);
      if (rand() < pScore) {
        scored.push(r);
        bits.push(`${r.name} scores from second`);
      } else if (!next[2]) {
        next[2] = { player: r };
      } else {
        scored.push(r);
      }
    }
    if (bases[0]) {
      const r = bases[0].player;
      const laneOpen = !next[2];
      const pThird = laneOpen ? clamp(0.22 + (spd(r) - 55) * 9e-3, 0.08, 0.62) : 0;
      if (rand() < pThird) {
        next[2] = { player: r };
        bits.push(`${r.name} first to third`);
      } else if (!next[1]) {
        next[1] = { player: r };
      } else {
        next[1] = { player: r };
      }
    }
    next[0] = { player: batter };
    return { scored, bases: next, note: bits.join("; ") };
  }
  function spTargetOuts(sp, rand) {
    const mean = 12 + sp.durability / 100 * 12;
    const jitter = (rand() - 0.5) * 4;
    return clamp(Math.round(mean + jitter), 9, 27);
  }
  function shouldPullStarter(arm, targetOuts, inning, outs, bases, scoreDiff, rand) {
    if (arm.outsRecorded >= targetOuts) return true;
    if (arm.bf >= 28 + arm.player.durability / 10) return true;
    const traffic = bases.filter(Boolean).length;
    if (arm.outsRecorded >= targetOuts - 3 && traffic >= 2 && rand() < 0.55) {
      return true;
    }
    if (inning >= 7 && arm.outsRecorded >= 15 && scoreDiff >= 0 && rand() < 0.35) {
      return true;
    }
    if (arm.runsAllowed >= 6 && arm.outsRecorded >= 9) return true;
    if (inning >= 8 && outs + arm.outsRecorded >= targetOuts - 1) return true;
    return false;
  }
  function pickReliever(pen, used, inning, scoreDiff, earlyExit) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    const available = pen.filter((a) => !used.has(a.player.id));
    if (available.length === 0) return null;
    const byRole = (role) => {
      var _a2;
      return (_a2 = available.find((a) => a.role === role)) != null ? _a2 : null;
    };
    if (inning >= 9 && scoreDiff > 0 && scoreDiff <= 3) {
      return (_b = (_a = byRole("CL")) != null ? _a : byRole("SU")) != null ? _b : available[0];
    }
    if (inning >= 8 && scoreDiff >= 0) {
      return (_e = (_d = (_c = byRole("SU")) != null ? _c : byRole("CL")) != null ? _d : byRole("LR")) != null ? _e : available[0];
    }
    if (earlyExit || inning <= 6) {
      return (_h = (_g = (_f = byRole("LR")) != null ? _f : byRole("MU")) != null ? _g : byRole("SU")) != null ? _h : available[0];
    }
    return (_l = (_k = (_j = (_i = byRole("SU")) != null ? _i : byRole("LR")) != null ? _j : byRole("MU")) != null ? _k : byRole("CL")) != null ? _l : available[0];
  }
  function tryStolenBase(bases, pitcher, batters, rand) {
    if (!bases[0] || bases[1]) return { bases, out: false };
    const runner = bases[0].player;
    const chance = clamp((runner.speed - 55) / 100, 0, 0.42);
    const hold = clamp((pitcher.control - 50) / 400, -0.05, 0.08);
    if (rand() > chance - hold) return { bases, out: false };
    const success = clamp(0.55 + (runner.speed - 60) * 6e-3, 0.45, 0.9);
    if (rand() < success) {
      batters.get(runner.id).sb += 1;
      return {
        bases: [null, { player: runner }, bases[2]],
        out: false,
        text: `${runner.name} steals second.`
      };
    }
    return {
      bases: [null, null, bases[2]],
      out: true,
      text: `${runner.name} caught stealing.`
    };
  }
  function simulateGame(opts) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
    const rand = mulberry32((_a = opts.seed) != null ? _a : Date.now());
    const prand = mulberry32((((_b = opts.seed) != null ? _b : Date.now()) >>> 0 ^ 2654435769) >>> 0);
    const playByPlay = [];
    const inningScores = [];
    const park = (_c = opts.park) != null ? _c : NEUTRAL_PARK;
    const era = (_d = opts.era) != null ? _d : ERAS.neutral;
    const homeGlove = lineupDefense(opts.homeLineup);
    const awayGlove = lineupDefense(opts.awayLineup);
    let homeErrors = 0;
    let awayErrors = 0;
    const homeFieldErrors = /* @__PURE__ */ new Map();
    const awayFieldErrors = /* @__PURE__ */ new Map();
    const ERROR_POS_WEIGHTS = [
      ["SS", 0.22],
      ["3B", 0.18],
      ["2B", 0.15],
      ["1B", 0.1],
      ["C", 0.05],
      ["LF", 0.09],
      ["CF", 0.09],
      ["RF", 0.09],
      ["P", 0.03]
    ];
    const chargeError = (fieldingLineup, errMap) => {
      var _a2, _b2;
      let roll = rand();
      let pos = "SS";
      for (const [p, w] of ERROR_POS_WEIGHTS) {
        roll -= w;
        if (roll < 0) {
          pos = p;
          break;
        }
      }
      const slot = (_b2 = (_a2 = fieldingLineup.find((e) => e.position === pos)) != null ? _a2 : fieldingLineup.find((e) => e.position === "SS")) != null ? _b2 : fieldingLineup[0];
      if (!slot) return;
      const prev = errMap.get(slot.player.id);
      if (prev) prev.errors += 1;
      else
        errMap.set(slot.player.id, {
          playerId: slot.player.id,
          name: slot.player.name,
          pos,
          errors: 1
        });
    };
    const awayBatters = new Map(
      opts.awayLineup.map((e) => [e.player.id, emptyBatter(e.player)])
    );
    const homeBatters = new Map(
      opts.homeLineup.map((e) => [e.player.id, emptyBatter(e.player)])
    );
    const homePitcherBoxes = [];
    const awayPitcherBoxes = [];
    const homeSp = (_g = (_e = opts.homeStaff.find((a) => a.role === "SP")) == null ? void 0 : _e.player) != null ? _g : (_f = opts.homeStaff[0]) == null ? void 0 : _f.player;
    const awaySp = (_j = (_h = opts.awayStaff.find((a) => a.role === "SP")) == null ? void 0 : _h.player) != null ? _j : (_i = opts.awayStaff[0]) == null ? void 0 : _i.player;
    if (!homeSp || !awaySp) throw new Error("Each team needs a starting pitcher");
    const homePen = opts.homeStaff.filter((a) => a.role !== "SP");
    const awayPen = opts.awayStaff.filter((a) => a.role !== "SP");
    let awayScore = 0;
    let homeScore = 0;
    let awayIdx = 0;
    let homeIdx = 0;
    let inning = 1;
    const decision = {
      win: null,
      loss: null,
      homeSave: null,
      awaySave: null
    };
    const packBases = (bases) => [
      Boolean(bases[0]),
      Boolean(bases[1]),
      Boolean(bases[2])
    ];
    const log = (half, text, sit = {}, extra = {}) => {
      var _a2, _b2, _c2;
      const fieldingHome = half === "top";
      const arm = fieldingHome ? homeArm : awayArm;
      playByPlay.push({
        inning,
        half,
        text,
        awayScore,
        homeScore,
        outs: (_a2 = sit.outs) != null ? _a2 : 0,
        bases: packBases((_b2 = sit.bases) != null ? _b2 : [null, null, null]),
        pitcher: (_c2 = arm == null ? void 0 : arm.player.name) != null ? _c2 : "",
        pitches: extra.pitches,
        batter: extra.batter
      });
    };
    const makeLive = (player, role) => {
      const box = emptyPitcher(player);
      if (role === "SP" || homePitcherBoxes.length + awayPitcherBoxes.length < 20) {
      }
      return { player, role, box, bf: 0, outsRecorded: 0, runsAllowed: 0, tired: false };
    };
    let homeArm = makeLive(homeSp, "SP");
    homePitcherBoxes.push(homeArm.box);
    let awayArm = makeLive(awaySp, "SP");
    awayPitcherBoxes.push(awayArm.box);
    const homeUsed = /* @__PURE__ */ new Set([homeSp.id]);
    const awayUsed = /* @__PURE__ */ new Set([awaySp.id]);
    const homeSpTarget = spTargetOuts(homeSp, rand);
    const awaySpTarget = spTargetOuts(awaySp, rand);
    let homeEarlyExit = false;
    let awayEarlyExit = false;
    const bringIn = (side, half, reason, sit) => {
      const fieldingHome = half === "top";
      const isHomePen = side === "home";
      const scoreDiff = isHomePen ? homeScore - awayScore : awayScore - homeScore;
      const early = isHomePen ? homeEarlyExit : awayEarlyExit;
      const pick = pickReliever(
        isHomePen ? homePen : awayPen,
        isHomePen ? homeUsed : awayUsed,
        inning,
        scoreDiff,
        early
      );
      if (!pick) {
        const arm = isHomePen ? homeArm : awayArm;
        arm.tired = true;
        log(
          half,
          `${arm.player.name} stays on with an empty pen (${reason}).`,
          sit
        );
        return;
      }
      const live = makeLive(pick.player, pick.role);
      if (isHomePen) {
        homeArm = live;
        homePitcherBoxes.push(live.box);
        homeUsed.add(pick.player.id);
        if (pick.role === "CL") decision.homeSave = live;
      } else {
        awayArm = live;
        awayPitcherBoxes.push(live.box);
        awayUsed.add(pick.player.id);
        if (pick.role === "CL") decision.awaySave = live;
      }
      log(
        half,
        `${pick.player.name} enters from the pen (${pick.role}) \u2014 ${reason}.`,
        sit
      );
    };
    const maybeHook = (half, outs, bases) => {
      const fieldingHome = half === "top";
      const arm = fieldingHome ? homeArm : awayArm;
      const sit = { outs, bases };
      if (arm.role !== "SP") {
        if (arm.bf >= 8 || arm.tired && bases.filter(Boolean).length >= 2) {
          bringIn(fieldingHome ? "home" : "away", half, "reliever spent", sit);
        }
        return;
      }
      const target = fieldingHome ? homeSpTarget : awaySpTarget;
      const scoreDiff = fieldingHome ? homeScore - awayScore : awayScore - homeScore;
      if (shouldPullStarter(arm, target, inning, outs, bases, scoreDiff, rand)) {
        if (arm.outsRecorded <= 12) {
          if (fieldingHome) homeEarlyExit = true;
          else awayEarlyExit = true;
        }
        bringIn(
          fieldingHome ? "home" : "away",
          half,
          arm.outsRecorded <= 12 ? "early exit" : "pitch count / traffic",
          sit
        );
      }
    };
    const noteLeadChange = (fieldingHome, prevHome, prevAway) => {
      const arm = fieldingHome ? homeArm : awayArm;
      const becameHomeLead = homeScore > awayScore && prevHome <= prevAway;
      const becameAwayLead = awayScore > homeScore && prevAway <= prevHome;
      if (becameHomeLead) {
        decision.loss = awayArm.box;
        decision.win = homeArm.box;
      } else if (becameAwayLead) {
        decision.loss = homeArm.box;
        decision.win = awayArm.box;
      }
      void arm;
    };
    const batHalf = (half, lineup, batters, startIdx) => {
      const fieldingHome = half === "top";
      let outs = 0;
      let bases = [null, null, null];
      let runsThisHalf = 0;
      let idx = startIdx;
      let pa = 0;
      if (inning >= 8) {
        maybeHook(half, 0, bases);
      }
      while (outs < 3 && pa < 40) {
        pa += 1;
        let arm = fieldingHome ? homeArm : awayArm;
        const steal = tryStolenBase(bases, arm.player, batters, rand);
        bases = steal.bases;
        if (steal.out) {
          outs += 1;
          arm.outsRecorded += 1;
          arm.box.ip += 1 / 3;
        }
        if (steal.text) {
          log(half, steal.text, { outs, bases });
          if (outs >= 3) break;
        }
        const entry = lineup[idx % lineup.length];
        idx += 1;
        const batter = entry.player;
        const box = batters.get(batter.id);
        arm = fieldingHome ? homeArm : awayArm;
        arm.bf += 1;
        const hand = batterHandVs(batter, arm.player);
        const platoon = platoonOffenseFactor(batter, arm.player);
        const climate = {
          park,
          era,
          defense: fieldingHome ? homeGlove : awayGlove,
          homeBat: !fieldingHome
        };
        const outcome = resolvePa(batter, arm, bases, outs, rand, climate);
        const pitches = buildPitchSequence(outcome, arm.player, prand);
        const pa_ = { pitches, batter: batter.name };
        const prevHome = homeScore;
        const prevAway = awayScore;
        const creditRun = (runner, rbiBatter) => {
          runsThisHalf += 1;
          if (fieldingHome) {
            awayScore += 1;
          } else {
            homeScore += 1;
          }
          batters.get(runner.id).r += 1;
          if (rbiBatter) box.rbi += 1;
          arm.box.r += 1;
          arm.box.er += 1;
          arm.runsAllowed += 1;
        };
        const creditUnearnedRun = (runner) => {
          runsThisHalf += 1;
          if (fieldingHome) awayScore += 1;
          else homeScore += 1;
          batters.get(runner.id).r += 1;
          arm.box.r += 1;
          arm.runsAllowed += 1;
        };
        if (outcome === "K") {
          outs += 1;
          box.ab += 1;
          box.so += 1;
          arm.box.so += 1;
          arm.box.ip += 1 / 3;
          arm.outsRecorded += 1;
          const tag = platoon < 0.85 && hand === arm.player.throws ? ` (tough ${hand}HB vs ${arm.player.throws}HP)` : "";
          log(half, `${batter.name} strikes out${tag}.`, { outs, bases }, pa_);
        } else if (outcome === "GIDP") {
          box.ab += 1;
          arm.box.ip += 2 / 3;
          arm.outsRecorded += 2;
          const runner = bases[0].player;
          bases = [null, null, bases[2]];
          outs = Math.min(3, outs + 2);
          log(
            half,
            `${batter.name} grounds into a double play (${runner.name} out at second).`,
            { outs, bases },
            pa_
          );
        } else if (outcome === "BB" || outcome === "HBP") {
          if (outcome === "BB") {
            box.bb += 1;
            arm.box.bb += 1;
          } else {
            box.hbp += 1;
          }
          const label = outcome === "BB" ? "walks" : "is hit by a pitch";
          if (bases[0] && bases[1] && bases[2]) {
            creditRun(bases[2].player, true);
            bases[2] = bases[1];
            bases[1] = bases[0];
            bases[0] = { player: batter };
            log(
              half,
              `${batter.name} ${label}, forcing in a run.`,
              { outs, bases },
              pa_
            );
          } else if (bases[0] && bases[1]) {
            bases[2] = bases[1];
            bases[1] = bases[0];
            bases[0] = { player: batter };
            log(half, `${batter.name} ${label}.`, { outs, bases }, pa_);
          } else if (bases[0]) {
            bases[1] = bases[0];
            bases[0] = { player: batter };
            log(half, `${batter.name} ${label}.`, { outs, bases }, pa_);
          } else {
            bases[0] = { player: batter };
            log(half, `${batter.name} ${label}.`, { outs, bases }, pa_);
          }
        } else if (outcome === "OUT") {
          const glove = fieldingHome ? homeGlove : awayGlove;
          const errChance = clamp(0.03 - (glove - 50) * 9e-4, 6e-3, 0.05);
          if (rand() < errChance) {
            box.ab += 1;
            if (fieldingHome) {
              homeErrors += 1;
              chargeError(opts.homeLineup, homeFieldErrors);
            } else {
              awayErrors += 1;
              chargeError(opts.awayLineup, awayFieldErrors);
            }
            const scoredE = [];
            const nextE = [null, null, null];
            if (bases[2]) scoredE.push(bases[2].player);
            if (bases[1]) nextE[2] = bases[1];
            if (bases[0]) nextE[1] = bases[0];
            nextE[0] = { player: batter };
            bases = nextE;
            for (const r of scoredE) creditUnearnedRun(r);
            const tail = scoredE.length ? ` \u2014 ${scoredE.length} unearned run${scoredE.length > 1 ? "s" : ""} score` : "";
            log(
              half,
              `${batter.name} reaches on an error${tail}.`,
              { outs, bases },
              pa_
            );
            noteLeadChange(fieldingHome, prevHome, prevAway);
            if (outs < 3) maybeHook(half, outs, bases);
            continue;
          }
          outs += 1;
          arm.box.ip += 1 / 3;
          arm.outsRecorded += 1;
          const kind = ["grounds out", "flies out", "lines out"][Math.floor(rand() * 3)];
          const contactSkill = clamp(
            1 - batter.kRate / 350 + batter.singleRate / 400,
            0.15,
            0.7
          );
          const isSacFly = !!bases[2] && outs < 3 && rand() < 0.22 + contactSkill * 0.25;
          if (isSacFly) {
            box.sf += 1;
            creditRun(bases[2].player, true);
            bases[2] = null;
            log(
              half,
              `${batter.name} ${kind} \u2014 run scores from third.`,
              { outs, bases },
              pa_
            );
          } else {
            box.ab += 1;
            log(half, `${batter.name} ${kind}.`, { outs, bases }, pa_);
          }
        } else {
          const hit = outcome === "1B" ? 1 : outcome === "2B" ? 2 : outcome === "3B" ? 3 : 4;
          box.ab += 1;
          box.h += 1;
          arm.box.h += 1;
          if (outcome === "2B") box.doubles += 1;
          else if (outcome === "3B") box.triples += 1;
          else if (outcome === "HR") {
            box.hr += 1;
            arm.box.hr += 1;
          }
          const {
            scored,
            bases: nextBases,
            note
          } = advanceOnHit(bases, batter, hit, rand);
          bases = nextBases;
          for (const runner of scored) creditRun(runner, true);
          const hitName = outcome === "1B" ? "singles" : outcome === "2B" ? "doubles" : outcome === "3B" ? "triples" : "homers";
          let text = `${batter.name} ${hitName}${outcome === "HR" ? "!" : ""}`;
          if (scored.length) {
            text += ` \u2014 ${scored.length} run${scored.length > 1 ? "s" : ""} score`;
          }
          if (note) text += ` (${note})`;
          text += ".";
          log(half, text, { outs, bases }, pa_);
        }
        noteLeadChange(fieldingHome, prevHome, prevAway);
        if (outs < 3) {
          maybeHook(half, outs, bases);
        }
      }
      inningScores.push(runsThisHalf);
      return idx;
    };
    while (inning <= 9 || awayScore === homeScore) {
      if (inning > 18) break;
      log("top", `=== Top ${inning} ===`);
      awayIdx = batHalf("top", opts.awayLineup, awayBatters, awayIdx);
      if (inning >= 9 && homeScore > awayScore) {
        inningScores.push(0);
        break;
      }
      log("bottom", `=== Bottom ${inning} ===`);
      homeIdx = batHalf("bottom", opts.homeLineup, homeBatters, homeIdx);
      inning += 1;
    }
    for (const b of [...homePitcherBoxes, ...awayPitcherBoxes]) {
      if (b.decision === "W" || b.decision === "L") b.decision = "";
    }
    if (homeScore > awayScore) {
      ((_k = decision.win) != null ? _k : homePitcherBoxes[0]).decision = "W";
      ((_l = decision.loss) != null ? _l : awayPitcherBoxes[0]).decision = "L";
      if (decision.homeSave && decision.homeSave.box !== decision.win && homeScore - awayScore <= 3 && decision.homeSave.box.ip > 0) {
        decision.homeSave.box.decision = "S";
      }
    } else if (awayScore > homeScore) {
      ((_m = decision.win) != null ? _m : awayPitcherBoxes[0]).decision = "W";
      ((_n = decision.loss) != null ? _n : homePitcherBoxes[0]).decision = "L";
      if (decision.awaySave && decision.awaySave.box !== decision.win && awayScore - homeScore <= 3 && decision.awaySave.box.ip > 0) {
        decision.awaySave.box.decision = "S";
      }
    }
    const roundIp = (p) => {
      p.ip = Math.round(p.ip * 3) / 3;
    };
    homePitcherBoxes.forEach(roundIp);
    awayPitcherBoxes.forEach(roundIp);
    const markStaffMilestones = (boxes) => {
      const sp = boxes[0];
      if (sp && sp.ip >= 5.999 && sp.er <= 3) sp.qs = 1;
      if (boxes.length === 1 && sp) {
        sp.cg = 1;
        if (sp.r === 0) sp.sho = 1;
      }
    };
    markStaffMilestones(homePitcherBoxes);
    markStaffMilestones(awayPitcherBoxes);
    return {
      homeScore,
      awayScore,
      innings: inningScores,
      homeErrors,
      awayErrors,
      homeFielding: [...homeFieldErrors.values()],
      awayFielding: [...awayFieldErrors.values()],
      playByPlay,
      homeBox: {
        batters: opts.homeLineup.map((e) => homeBatters.get(e.player.id)),
        pitchers: homePitcherBoxes
      },
      awayBox: {
        batters: opts.awayLineup.map((e) => awayBatters.get(e.player.id)),
        pitchers: awayPitcherBoxes
      },
      homePitcher: homeSp.name,
      awayPitcher: awaySp.name
    };
  }
  function formatIp(ip) {
    const whole = Math.floor(ip + 1e-9);
    const thirds = Math.round((ip - whole) * 3);
    return `${whole}.${thirds}`;
  }
  return __toCommonJS(sim_exports);
})();
