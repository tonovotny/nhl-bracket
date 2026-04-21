import type { TeamSeed } from "./seed";

type NHLStanding = {
  teamName: { default: string };
  teamAbbrev: { default: string };
  conferenceAbbrev: string;
  conferenceSequence: number;
  divisionAbbrev: string;
  divisionSequence: number;
  wildcardSequence: number;
  points: number;
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
  topSeedTeam?: { abbrev: string };
  bottomSeedTeam?: { abbrev: string };
};

type NHLPlayoffResponse = {
  series: NHLPlayoffSeries[];
};

// Keyed by "ABBREV1-ABBREV2" (sorted) → { wins for each abbrev }
export type SeriesWinsMap = Record<string, { [abbrev: string]: number }>;

export async function fetchPlayoffSeriesWins(): Promise<SeriesWinsMap> {
  const res = await fetch("https://api-web.nhle.com/v1/playoff-bracket/2026", {
    next: { revalidate: 300 }, // cache for 5 minutes
  });

  if (!res.ok) return {};

  const data: NHLPlayoffResponse = await res.json();
  const result: SeriesWinsMap = {};

  for (const s of data.series) {
    const topAbbrev = s.topSeedTeam?.abbrev;
    const botAbbrev = s.bottomSeedTeam?.abbrev;
    if (!topAbbrev || !botAbbrev) continue;
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
    const divRank = team.divisionSequence;
    const wcRank = team.wildcardSequence;

    // Playoff teams: top 3 in each division (divisionSequence 1-3) + 2 wild cards
    const isPlayoff = divRank <= 3 || (wcRank >= 1 && wcRank <= 2);
    if (!isPlayoff) continue;

    const entry: TeamSeed = {
      id: 0, // assigned below
      name: team.teamName.default,
      abbreviation: team.teamAbbrev.default,
      seed: team.conferenceSequence, // overall conference rank for display
      conference: conf,
      division: team.divisionAbbrev,
      divisionRank: divRank <= 3 ? divRank : 0,
      wildcardRank: wcRank >= 1 && wcRank <= 2 ? wcRank : 0,
    };

    if (conf === "W") {
      western.push(entry);
    } else {
      eastern.push(entry);
    }
  }

  // Sort by conference seed and assign stable IDs: W seeds get IDs 1-8, E seeds get IDs 9-16
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
