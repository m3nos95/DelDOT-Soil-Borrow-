import { prisma } from "./db";
import { ensureDefaultLineup, getLeaguePayroll } from "./league";

export async function executeTrade(opts: {
  leagueId: string;
  proposerTeamId: string;
  partnerTeamId: string;
  proposerPlayerIds: string[];
  partnerPlayerIds: string[];
  note?: string;
  /** If true, create as accepted and move players immediately */
  autoAccept?: boolean;
}) {
  const {
    leagueId,
    proposerTeamId,
    partnerTeamId,
    proposerPlayerIds,
    partnerPlayerIds,
    note = "",
    autoAccept = false,
  } = opts;

  if (proposerTeamId === partnerTeamId) {
    throw new Error("Cannot trade with yourself");
  }
  if (!proposerPlayerIds.length && !partnerPlayerIds.length) {
    throw new Error("Trade is empty");
  }

  // Avoid duplicate pending offers between the same clubs
  if (!autoAccept) {
    const existing = await prisma.trade.findFirst({
      where: {
        leagueId,
        status: "pending",
        OR: [
          { proposerTeamId, partnerTeamId },
          { proposerTeamId: partnerTeamId, partnerTeamId: proposerTeamId },
        ],
      },
    });
    if (existing) {
      throw new Error("A pending trade already exists between these teams");
    }
  }

  const trade = await prisma.trade.create({
    data: {
      leagueId,
      proposerTeamId,
      partnerTeamId,
      status: autoAccept ? "accepted" : "pending",
      note,
      resolvedAt: autoAccept ? new Date() : null,
      assets: {
        create: [
          ...proposerPlayerIds.map((playerId) => ({
            fromTeamId: proposerTeamId,
            playerId,
          })),
          ...partnerPlayerIds.map((playerId) => ({
            fromTeamId: partnerTeamId,
            playerId,
          })),
        ],
      },
    },
  });

  if (autoAccept) {
    await applyTradeAssets(trade.id);
  }

  return trade;
}

async function assertRosterAfter(
  teamId: string,
  losing: string[],
  gaining: { id: string; salary: number; isPitcher: boolean }[],
  salaryCap: number,
) {
  const spots = await prisma.rosterSpot.findMany({
    where: { teamId },
    include: { player: true },
  });
  const lose = new Set(losing);
  const kept = spots.filter((s) => !lose.has(s.playerId));
  const payroll =
    kept.reduce((s, r) => s + r.player.salary, 0) +
    gaining.reduce((s, p) => s + p.salary, 0);
  if (payroll > salaryCap) throw new Error("Trade exceeds salary cap");

  const hitters =
    kept.filter((s) => !s.player.isPitcher).length +
    gaining.filter((p) => !p.isPitcher).length;
  const pitchers =
    kept.filter((s) => s.player.isPitcher).length +
    gaining.filter((p) => p.isPitcher).length;
  const total = kept.length + gaining.length;
  if (total > 25) throw new Error("Trade would exceed 25-man roster");
  if (hitters > 14) throw new Error("Trade would exceed 14 hitters");
  if (pitchers > 11) throw new Error("Trade would exceed 11 pitchers");
}

export async function applyTradeAssets(tradeId: string) {
  const trade = await prisma.trade.findUniqueOrThrow({
    where: { id: tradeId },
    include: {
      assets: { include: { player: true } },
      league: true,
    },
  });

  const fromProposer = trade.assets.filter(
    (a) => a.fromTeamId === trade.proposerTeamId,
  );
  const fromPartner = trade.assets.filter(
    (a) => a.fromTeamId === trade.partnerTeamId,
  );

  await assertRosterAfter(
    trade.proposerTeamId,
    fromProposer.map((a) => a.playerId),
    fromPartner.map((a) => a.player),
    trade.league.salaryCap,
  );
  await assertRosterAfter(
    trade.partnerTeamId,
    fromPartner.map((a) => a.playerId),
    fromProposer.map((a) => a.player),
    trade.league.salaryCap,
  );

  // Verify ownership
  for (const a of trade.assets) {
    const spot = await prisma.rosterSpot.findFirst({
      where: { teamId: a.fromTeamId, playerId: a.playerId },
    });
    if (!spot) throw new Error("Player no longer on trading team");
  }

  await prisma.$transaction(async (tx) => {
    for (const a of trade.assets) {
      await tx.lineupSlot.deleteMany({
        where: { teamId: a.fromTeamId, playerId: a.playerId },
      });
      await tx.staffSlot.deleteMany({
        where: { teamId: a.fromTeamId, playerId: a.playerId },
      });
      await tx.rosterSpot.deleteMany({
        where: { teamId: a.fromTeamId, playerId: a.playerId },
      });
    }
    for (const a of fromProposer) {
      await tx.rosterSpot.create({
        data: { teamId: trade.partnerTeamId, playerId: a.playerId },
      });
    }
    for (const a of fromPartner) {
      await tx.rosterSpot.create({
        data: { teamId: trade.proposerTeamId, playerId: a.playerId },
      });
    }
    await tx.trade.update({
      where: { id: tradeId },
      data: { status: "accepted", resolvedAt: new Date() },
    });
  });

  await ensureDefaultLineup(trade.proposerTeamId);
  await ensureDefaultLineup(trade.partnerTeamId);
}

export async function rejectTrade(tradeId: string) {
  await prisma.trade.update({
    where: { id: tradeId },
    data: { status: "rejected", resolvedAt: new Date() },
  });
}

export async function cancelTrade(tradeId: string) {
  await prisma.trade.update({
    where: { id: tradeId },
    data: { status: "cancelled", resolvedAt: new Date() },
  });
}

export async function validateTradePieces(opts: {
  leagueId: string;
  proposerTeamId: string;
  partnerTeamId: string;
  proposerPlayerIds: string[];
  partnerPlayerIds: string[];
}) {
  const league = await prisma.league.findUniqueOrThrow({
    where: { id: opts.leagueId },
  });
  if (league.status !== "season" && league.status !== "drafting") {
    throw new Error("Trades are closed");
  }

  for (const id of opts.proposerPlayerIds) {
    const spot = await prisma.rosterSpot.findFirst({
      where: { teamId: opts.proposerTeamId, playerId: id },
    });
    if (!spot) throw new Error("You can only trade your own players");
  }
  for (const id of opts.partnerPlayerIds) {
    const spot = await prisma.rosterSpot.findFirst({
      where: { teamId: opts.partnerTeamId, playerId: id },
    });
    if (!spot) throw new Error("Partner player not on that roster");
  }

  const propPayroll = await getLeaguePayroll(opts.proposerTeamId);
  const partPayroll = await getLeaguePayroll(opts.partnerTeamId);
  const propPlayers = await prisma.player.findMany({
    where: { id: { in: opts.proposerPlayerIds } },
  });
  const partPlayers = await prisma.player.findMany({
    where: { id: { in: opts.partnerPlayerIds } },
  });

  await assertRosterAfter(
    opts.proposerTeamId,
    opts.proposerPlayerIds,
    partPlayers,
    league.salaryCap,
  );
  await assertRosterAfter(
    opts.partnerTeamId,
    opts.partnerPlayerIds,
    propPlayers,
    league.salaryCap,
  );

  return { propPayroll, partPayroll, propPlayers, partPlayers, league };
}
