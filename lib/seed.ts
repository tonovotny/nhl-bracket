// 2026 NHL Playoff teams (projected as of April 2, 2026)
// Update these when the field is officially confirmed (~April 12)

export type TeamSeed = {
  id: number;
  name: string;
  abbreviation: string;
  seed: number;
  conference: string;
};

// Western Conference
// Division winners get seeds 1-2, wild cards are WC1/WC2
export const westernTeams: TeamSeed[] = [
  { id: 1, name: "Winnipeg Jets", abbreviation: "WPG", seed: 1, conference: "W" },
  { id: 2, name: "Dallas Stars", abbreviation: "DAL", seed: 2, conference: "W" },
  { id: 3, name: "Vegas Golden Knights", abbreviation: "VGK", seed: 3, conference: "W" },
  { id: 4, name: "Edmonton Oilers", abbreviation: "EDM", seed: 4, conference: "W" },
  { id: 5, name: "Minnesota Wild", abbreviation: "MIN", seed: 5, conference: "W" },
  { id: 6, name: "Los Angeles Kings", abbreviation: "LAK", seed: 6, conference: "W" },
  { id: 7, name: "Colorado Avalanche", abbreviation: "COL", seed: 7, conference: "W" },
  { id: 8, name: "Vancouver Canucks", abbreviation: "VAN", seed: 8, conference: "W" },
];

// Eastern Conference
export const easternTeams: TeamSeed[] = [
  { id: 9, name: "Washington Capitals", abbreviation: "WSH", seed: 1, conference: "E" },
  { id: 10, name: "Toronto Maple Leafs", abbreviation: "TOR", seed: 2, conference: "E" },
  { id: 11, name: "Florida Panthers", abbreviation: "FLA", seed: 3, conference: "E" },
  { id: 12, name: "Carolina Hurricanes", abbreviation: "CAR", seed: 4, conference: "E" },
  { id: 13, name: "New Jersey Devils", abbreviation: "NJD", seed: 5, conference: "E" },
  { id: 14, name: "Tampa Bay Lightning", abbreviation: "TBL", seed: 6, conference: "E" },
  { id: 15, name: "Ottawa Senators", abbreviation: "OTT", seed: 7, conference: "E" },
  { id: 16, name: "Montreal Canadiens", abbreviation: "MTL", seed: 8, conference: "E" },
];

export const allTeams = [...westernTeams, ...easternTeams];

// Round 1 matchups: 1v8, 2v7, 3v6, 4v5 in each conference
export const round1Matchups = [
  // Western
  { slotId: "W_R1_1", home: 1, away: 8 }, // WPG vs VAN
  { slotId: "W_R1_2", home: 2, away: 7 }, // DAL vs COL
  { slotId: "W_R1_3", home: 3, away: 6 }, // VGK vs LAK
  { slotId: "W_R1_4", home: 4, away: 5 }, // EDM vs MIN
  // Eastern
  { slotId: "E_R1_1", home: 9, away: 16 }, // WSH vs MTL
  { slotId: "E_R1_2", home: 10, away: 15 }, // TOR vs OTT
  { slotId: "E_R1_3", home: 11, away: 14 }, // FLA vs TBL
  { slotId: "E_R1_4", home: 12, away: 13 }, // CAR vs NJD
];

// All series slots (Round 2+ don't have teams assigned yet)
export const allSlots = [
  // Round 1
  ...round1Matchups.map((m) => ({ slotId: m.slotId, round: 1 })),
  // Round 2
  { slotId: "W_R2_1", round: 2 }, // Winner of W_R1_1 vs W_R1_2
  { slotId: "W_R2_2", round: 2 }, // Winner of W_R1_3 vs W_R1_4
  { slotId: "E_R2_1", round: 2 }, // Winner of E_R1_1 vs E_R1_2
  { slotId: "E_R2_2", round: 2 }, // Winner of E_R1_3 vs E_R1_4
  // Conference Finals
  { slotId: "W_CF", round: 3 },
  { slotId: "E_CF", round: 3 },
  // Stanley Cup Finals
  { slotId: "SCF", round: 4 },
];

// Bracket topology: which slots feed into which
export const bracketTopology: Record<string, [string, string]> = {
  W_R2_1: ["W_R1_1", "W_R1_2"],
  W_R2_2: ["W_R1_3", "W_R1_4"],
  E_R2_1: ["E_R1_1", "E_R1_2"],
  E_R2_2: ["E_R1_3", "E_R1_4"],
  W_CF: ["W_R2_1", "W_R2_2"],
  E_CF: ["E_R2_1", "E_R2_2"],
  SCF: ["W_CF", "E_CF"],
};
