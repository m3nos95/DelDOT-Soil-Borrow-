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
    batterHandVs: () => batterHandVs,
    deriveSpeed: () => deriveSpeed,
    formatIp: () => formatIp,
    platoonOffenseFactor: () => platoonOffenseFactor,
    simulateGame: () => simulateGame
  });
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
  function deriveSpeed(p) {
    if (p.isPitcher) return 30;
    return clamp(28 + p.tripleRate * 3.2 - p.hrRate * 0.15, 20, 96);
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
      sb: 0
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
      decision: ""
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
  function resolvePa(batter, arm, bases, outs, rand) {
    const pitcher = arm.player;
    const platoon = platoonOffenseFactor(batter, pitcher);
    const fatigue = fatigueFactor(arm);
    const stuffMod = (pitcher.stuff - 50) / 100;
    const controlMod = (pitcher.control - 50) / 100;
    let k = batter.kRate * (1 + stuffMod * 0.6) * (2 - platoon) * (1.05 - (fatigue - 1) * 0.35);
    let bb = batter.bbRate * (1 - controlMod * 0.65) * platoon * (0.95 + (fatigue - 1) * 0.4);
    let hbp = batter.hbpRate * (1 + (fatigue - 1) * 0.2);
    let single = batter.singleRate * (1 - stuffMod * 0.22) * platoon * fatigue;
    let double = batter.doubleRate * (1 - stuffMod * 0.18) * platoon * fatigue;
    let triple = batter.tripleRate * platoon;
    let hr = batter.hrRate * (1 - stuffMod * 0.32) * platoon * (0.9 + (fatigue - 1) * 0.5);
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
    single = clamp(single, 60, 260);
    double = clamp(double, 15, 100);
    triple = clamp(triple, 1, 30);
    hr = clamp(hr, 3, 130);
    const contact = single + double + triple + hr;
    const nonOut = k + bb + hbp + contact;
    let out = Math.max(200, 1e3 - nonOut);
    let gidp = 0;
    if (bases[0] && !bases[1] && outs < 2) {
      const slow = (100 - batter.speed) / 100;
      gidp = clamp(18 + slow * 55 + batter.hrRate * 0.08, 10, 90);
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
  function advanceBases(bases, batter, basesToAdvance) {
    const scored = [];
    const next = [null, null, null];
    for (let i = 2; i >= 0; i--) {
      const runner = bases[i];
      if (!runner) continue;
      const dest = i + basesToAdvance;
      if (dest >= 3) scored.push(runner.player);
      else next[dest] = runner;
    }
    if (basesToAdvance >= 4) scored.push(batter);
    else next[basesToAdvance - 1] = { player: batter };
    return { scored, bases: next };
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const rand = mulberry32((_a = opts.seed) != null ? _a : Date.now());
    const playByPlay = [];
    const inningScores = [];
    const awayBatters = new Map(
      opts.awayLineup.map((e) => [e.player.id, emptyBatter(e.player)])
    );
    const homeBatters = new Map(
      opts.homeLineup.map((e) => [e.player.id, emptyBatter(e.player)])
    );
    const homePitcherBoxes = [];
    const awayPitcherBoxes = [];
    const homeSp = (_d = (_b = opts.homeStaff.find((a) => a.role === "SP")) == null ? void 0 : _b.player) != null ? _d : (_c = opts.homeStaff[0]) == null ? void 0 : _c.player;
    const awaySp = (_g = (_e = opts.awayStaff.find((a) => a.role === "SP")) == null ? void 0 : _e.player) != null ? _g : (_f = opts.awayStaff[0]) == null ? void 0 : _f.player;
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
    const log = (half, text, sit = {}) => {
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
        pitcher: (_c2 = arm == null ? void 0 : arm.player.name) != null ? _c2 : ""
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
        const outcome = resolvePa(batter, arm, bases, outs, rand);
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
        if (outcome === "K") {
          outs += 1;
          box.ab += 1;
          box.so += 1;
          arm.box.so += 1;
          arm.box.ip += 1 / 3;
          arm.outsRecorded += 1;
          const tag = platoon < 0.85 && hand === arm.player.throws ? ` (tough ${hand}HB vs ${arm.player.throws}HP)` : "";
          log(half, `${batter.name} strikes out${tag}.`, { outs, bases });
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
            { outs, bases }
          );
        } else if (outcome === "BB" || outcome === "HBP") {
          if (outcome === "BB") {
            box.bb += 1;
            arm.box.bb += 1;
          }
          const label = outcome === "BB" ? "walks" : "is hit by a pitch";
          if (bases[0] && bases[1] && bases[2]) {
            creditRun(bases[2].player, true);
            bases[2] = bases[1];
            bases[1] = bases[0];
            bases[0] = { player: batter };
            log(half, `${batter.name} ${label}, forcing in a run.`, {
              outs,
              bases
            });
          } else if (bases[0] && bases[1]) {
            bases[2] = bases[1];
            bases[1] = bases[0];
            bases[0] = { player: batter };
            log(half, `${batter.name} ${label}.`, { outs, bases });
          } else if (bases[0]) {
            bases[1] = bases[0];
            bases[0] = { player: batter };
            log(half, `${batter.name} ${label}.`, { outs, bases });
          } else {
            bases[0] = { player: batter };
            log(half, `${batter.name} ${label}.`, { outs, bases });
          }
        } else if (outcome === "OUT") {
          outs += 1;
          box.ab += 1;
          arm.box.ip += 1 / 3;
          arm.outsRecorded += 1;
          const kind = ["grounds out", "flies out", "lines out"][Math.floor(rand() * 3)];
          const contactSkill = clamp(
            1 - batter.kRate / 350 + batter.singleRate / 400,
            0.15,
            0.7
          );
          if (bases[2] && outs < 3 && rand() < 0.22 + contactSkill * 0.25) {
            creditRun(bases[2].player, true);
            bases[2] = null;
            log(half, `${batter.name} ${kind} \u2014 run scores from third.`, {
              outs,
              bases
            });
          } else {
            log(half, `${batter.name} ${kind}.`, { outs, bases });
          }
        } else {
          const advance = outcome === "1B" ? 1 : outcome === "2B" ? 2 : outcome === "3B" ? 3 : 4;
          box.ab += 1;
          box.h += 1;
          arm.box.h += 1;
          if (outcome === "HR") {
            box.hr += 1;
            arm.box.hr += 1;
          }
          const { scored, bases: nextBases } = advanceBases(
            bases,
            batter,
            advance
          );
          bases = nextBases;
          for (const runner of scored) creditRun(runner, true);
          const hitName = outcome === "1B" ? "singles" : outcome === "2B" ? "doubles" : outcome === "3B" ? "triples" : "homers";
          if (scored.length) {
            log(
              half,
              `${batter.name} ${hitName}${outcome === "HR" ? "!" : ""} \u2014 ${scored.length} run${scored.length > 1 ? "s" : ""} score.`,
              { outs, bases }
            );
          } else {
            log(half, `${batter.name} ${hitName}.`, { outs, bases });
          }
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
      ((_h = decision.win) != null ? _h : homePitcherBoxes[0]).decision = "W";
      ((_i = decision.loss) != null ? _i : awayPitcherBoxes[0]).decision = "L";
      if (decision.homeSave && decision.homeSave.box !== decision.win && homeScore - awayScore <= 3 && decision.homeSave.box.ip > 0) {
        decision.homeSave.box.decision = "S";
      }
    } else if (awayScore > homeScore) {
      ((_j = decision.win) != null ? _j : awayPitcherBoxes[0]).decision = "W";
      ((_k = decision.loss) != null ? _k : homePitcherBoxes[0]).decision = "L";
      if (decision.awaySave && decision.awaySave.box !== decision.win && awayScore - homeScore <= 3 && decision.awaySave.box.ip > 0) {
        decision.awaySave.box.decision = "S";
      }
    }
    const roundIp = (p) => {
      p.ip = Math.round(p.ip * 3) / 3;
    };
    homePitcherBoxes.forEach(roundIp);
    awayPitcherBoxes.forEach(roundIp);
    return {
      homeScore,
      awayScore,
      innings: inningScores,
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
