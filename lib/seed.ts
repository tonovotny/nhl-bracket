export type TeamSeed = {
  id: number;
  name: string;
  abbreviation: string;
  seed: number;
  conference: string;
  division?: string;
  divisionRank?: number; // 1-3 within division, 0 = wild card
  wildcardRank?: number; // 1-2 for wild cards, 0 = division team
};

// Conference division mapping
const CONF_DIVISIONS: Record<string, [string, string]> = {
  W: ["C", "P"], // Central, Pacific
  E: ["A", "M"], // Atlantic, Metropolitan
};

// Build Round 1 matchups using NHL division-based format:
// - Each division's #2 vs #3
// - Best division winner vs worst wild card (WC2)
// - Other division winner vs better wild card (WC1)
// Slot layout per conference: R1_1 & R1_2 = Div1 side, R1_3 & R1_4 = Div2 side
export function buildRound1Matchups(teams: TeamSeed[]) {
  const matchups: { slotId: string; home: number; away: number }[] = [];

  for (const conf of ["W", "E"] as const) {
    const confTeams = teams.filter((t) => t.conference === conf);
    const [div1, div2] = CONF_DIVISIONS[conf];

    const div1Teams = confTeams.filter((t) => t.division === div1 && t.divisionRank! > 0).sort((a, b) => a.divisionRank! - b.divisionRank!);
    const div2Teams = confTeams.filter((t) => t.division === div2 && t.divisionRank! > 0).sort((a, b) => a.divisionRank! - b.divisionRank!);
    const wildCards = confTeams.filter((t) => t.wildcardRank! > 0).sort((a, b) => a.wildcardRank! - b.wildcardRank!);

    // Determine which division winner has the better record (lower seed = better)
    const div1Winner = div1Teams[0];
    const div2Winner = div2Teams[0];
    const div1Best = div1Winner.seed < div2Winner.seed;

    // Best division winner gets WC2 (worse wild card), other gets WC1
    const bestWinner = div1Best ? div1Winner : div2Winner;
    const otherWinner = div1Best ? div2Winner : div1Winner;
    const bestDiv2nd = div1Best ? div1Teams[1] : div2Teams[1];
    const bestDiv3rd = div1Best ? div1Teams[2] : div2Teams[2];
    const otherDiv2nd = div1Best ? div2Teams[1] : div1Teams[1];
    const otherDiv3rd = div1Best ? div2Teams[2] : div1Teams[2];

    // R1_1 & R1_2 = best division winner's side
    // R1_3 & R1_4 = other division winner's side
    matchups.push(
      { slotId: `${conf}_R1_1`, home: bestWinner.id, away: wildCards[1]?.id },   // Best div winner vs WC2
      { slotId: `${conf}_R1_2`, home: bestDiv2nd.id, away: bestDiv3rd.id },       // Best div 2nd vs 3rd
      { slotId: `${conf}_R1_3`, home: otherWinner.id, away: wildCards[0]?.id },   // Other div winner vs WC1
      { slotId: `${conf}_R1_4`, home: otherDiv2nd.id, away: otherDiv3rd.id },     // Other div 2nd vs 3rd
    );
  }

  return matchups;
}

// All series slots (static structure, doesn't depend on teams)
export const allSlots = [
  { slotId: "W_R1_1", round: 1 },
  { slotId: "W_R1_2", round: 1 },
  { slotId: "W_R1_3", round: 1 },
  { slotId: "W_R1_4", round: 1 },
  { slotId: "E_R1_1", round: 1 },
  { slotId: "E_R1_2", round: 1 },
  { slotId: "E_R1_3", round: 1 },
  { slotId: "E_R1_4", round: 1 },
  // Round 2 (fixed bracket within division sides: R1_1 vs R1_2, R1_3 vs R1_4)
  { slotId: "W_R2_1", round: 2 },
  { slotId: "W_R2_2", round: 2 },
  { slotId: "E_R2_1", round: 2 },
  { slotId: "E_R2_2", round: 2 },
  // Conference Finals (R2_1 winner vs R2_2 winner)
  { slotId: "W_CF", round: 3 },
  { slotId: "E_CF", round: 3 },
  // Stanley Cup Finals
  { slotId: "SCF", round: 4 },
];
