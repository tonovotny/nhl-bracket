import { db } from "./db";
import { series, teams } from "./schema";
import { eq } from "drizzle-orm";
import { fetchPlayoffSeriesWins } from "./nhl-api";

// R2+ slots inherit teams from these feeder slots (home = first, away = second)
const BRACKET_PATHS: Record<string, [string, string]> = {
  W_R2_1: ["W_R1_1", "W_R1_2"],
  W_R2_2: ["W_R1_3", "W_R1_4"],
  E_R2_1: ["E_R1_1", "E_R1_2"],
  E_R2_2: ["E_R1_3", "E_R1_4"],
  W_CF: ["W_R2_1", "W_R2_2"],
  E_CF: ["E_R2_1", "E_R2_2"],
  SCF: ["W_CF", "E_CF"],
};

type SeriesRow = typeof series.$inferSelect;

// Pull live wins from the NHL API and reconcile each series in the DB:
// update wins, derive status/winner/gamesPlayed, and cascade winners into
// downstream slots (homeTeamId/awayTeamId) as feeders complete.
export async function syncSeriesResults() {
  const [winsMap, teamRows, allSeries] = await Promise.all([
    fetchPlayoffSeriesWins().catch(() => ({})),
    db.select().from(teams).all(),
    db.select().from(series).all(),
  ]);

  const abbrevById = new Map<number, string>();
  for (const t of teamRows) abbrevById.set(t.id, t.abbreviation);

  const byRound = [...allSeries].sort((a, b) => a.round - b.round);
  const state = new Map<string, SeriesRow>(byRound.map((s) => [s.slotId, { ...s }]));

  for (const s of byRound) {
    const cur = state.get(s.slotId)!;

    // Cascade: inherit teams from feeder winners for R2+
    if (s.round > 1) {
      const feeders = BRACKET_PATHS[s.slotId];
      if (feeders) {
        if (!cur.homeTeamId) cur.homeTeamId = state.get(feeders[0])?.winnerTeamId ?? null;
        if (!cur.awayTeamId) cur.awayTeamId = state.get(feeders[1])?.winnerTeamId ?? null;
      }
    }

    if (cur.homeTeamId && cur.awayTeamId) {
      const homeAbbrev = abbrevById.get(cur.homeTeamId);
      const awayAbbrev = abbrevById.get(cur.awayTeamId);
      if (homeAbbrev && awayAbbrev) {
        const key = [homeAbbrev, awayAbbrev].sort().join("-");
        const wins = winsMap[key];
        if (wins) {
          cur.homeTeamWins = wins[homeAbbrev] ?? 0;
          cur.awayTeamWins = wins[awayAbbrev] ?? 0;
        }
      }

      if (cur.homeTeamWins >= 4) {
        cur.status = "complete";
        cur.winnerTeamId = cur.homeTeamId;
        cur.gamesPlayed = cur.homeTeamWins + cur.awayTeamWins;
      } else if (cur.awayTeamWins >= 4) {
        cur.status = "complete";
        cur.winnerTeamId = cur.awayTeamId;
        cur.gamesPlayed = cur.homeTeamWins + cur.awayTeamWins;
      } else if (cur.homeTeamWins > 0 || cur.awayTeamWins > 0) {
        cur.status = "active";
        cur.winnerTeamId = null;
        cur.gamesPlayed = null;
      } else {
        cur.status = "pending";
        cur.winnerTeamId = null;
        cur.gamesPlayed = null;
      }
    }

    const changed =
      cur.homeTeamId !== s.homeTeamId ||
      cur.awayTeamId !== s.awayTeamId ||
      cur.homeTeamWins !== s.homeTeamWins ||
      cur.awayTeamWins !== s.awayTeamWins ||
      cur.status !== s.status ||
      cur.winnerTeamId !== s.winnerTeamId ||
      cur.gamesPlayed !== s.gamesPlayed;

    if (changed) {
      await db
        .update(series)
        .set({
          homeTeamId: cur.homeTeamId,
          awayTeamId: cur.awayTeamId,
          homeTeamWins: cur.homeTeamWins,
          awayTeamWins: cur.awayTeamWins,
          status: cur.status,
          winnerTeamId: cur.winnerTeamId,
          gamesPlayed: cur.gamesPlayed,
        })
        .where(eq(series.slotId, s.slotId))
        .run();
    }
  }

  return Array.from(state.values());
}
