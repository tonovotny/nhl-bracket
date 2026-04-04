import type { TeamSeed } from "./seed";

type NHLStanding = {
  teamName: { default: string };
  teamAbbrev: { default: string };
  conferenceAbbrev: string;
  conferenceSequence: number;
  clinchIndicator?: string | null;
};

type NHLStandingsResponse = {
  standings: NHLStanding[];
};

type NHLPlayoffSeries = {
  playoffRound: number;
  topSeedWins: number;
  bottomSeedWins: number;
  winningTeamId?: number;
  topSeedTeam: { abbrev: string };
  bottomSeedTeam: { abbrev: string };
};

type NHLPlayoffResponse = {
  series: NHLPlayoffSeries[];
};

// Keyed by "ABBREV1-ABBREV2" (sorted) → { wins for each abbrev }
export type SeriesWinsMap = Record<string, { [abbrev: string]: number }>;

export async function fetchPlayoffSeriesWins(): Promise<SeriesWinsMap> {
  const res = await fetch("https://api-web.nhle.com/v1/playoff-bracket/2025", {
    next: { revalidate: 300 }, // cache for 5 minutes
  });

  if (!res.ok) return {};

  const data: NHLPlayoffResponse = await res.json();
  const result: SeriesWinsMap = {};

  for (const s of data.series) {
    const topAbbrev = s.topSeedTeam.abbrev;
    const botAbbrev = s.bottomSeedTeam.abbrev;
    const key = [topAbbrev, botAbbrev].sort().join("-");
    result[key] = {
      [topAbbrev]: s.topSeedWins,
      [botAbbrev]: s.bottomSeedWins,
    };
  }

  return result;
}

export async function fetchPlayoffTeams(): Promise<TeamSeed[]> {
  const res = await fetch("https://api-web.nhle.com/v1/standings/now", {
    next: { revalidate: 3600 }, // cache for 1 hour
  });

  if (!res.ok) {
    throw new Error(`NHL API error: ${res.status}`);
  }

  const data: NHLStandingsResponse = await res.json();

  const western: TeamSeed[] = [];
  const eastern: TeamSeed[] = [];

  for (const team of data.standings) {
    const conf = team.conferenceAbbrev; // "W" or "E"
    const seed = team.conferenceSequence;

    // Only top 8 per conference make playoffs
    if (seed > 8) continue;

    const entry: TeamSeed = {
      id: 0, // assigned below
      name: team.teamName.default,
      abbreviation: team.teamAbbrev.default,
      seed,
      conference: conf,
    };

    if (conf === "W") {
      western.push(entry);
    } else {
      eastern.push(entry);
    }
  }

  // Sort by seed and assign stable IDs: W seeds 1-8 get IDs 1-8, E seeds 1-8 get IDs 9-16
  western.sort((a, b) => a.seed - b.seed);
  eastern.sort((a, b) => a.seed - b.seed);

  for (let i = 0; i < western.length; i++) {
    western[i].id = i + 1;
  }
  for (let i = 0; i < eastern.length; i++) {
    eastern[i].id = i + 9;
  }

  return [...western, ...eastern];
}
