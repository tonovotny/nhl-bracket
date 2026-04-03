export type TeamSeed = {
  id: number;
  name: string;
  abbreviation: string;
  seed: number;
  conference: string;
};

// Build Round 1 matchups from teams: 1v8, 2v7, 3v6, 4v5 per conference
export function buildRound1Matchups(teams: TeamSeed[]) {
  const western = teams.filter((t) => t.conference === "W").sort((a, b) => a.seed - b.seed);
  const eastern = teams.filter((t) => t.conference === "E").sort((a, b) => a.seed - b.seed);

  return [
    { slotId: "W_R1_1", home: western[0]?.id, away: western[7]?.id },
    { slotId: "W_R1_2", home: western[1]?.id, away: western[6]?.id },
    { slotId: "W_R1_3", home: western[2]?.id, away: western[5]?.id },
    { slotId: "W_R1_4", home: western[3]?.id, away: western[4]?.id },
    { slotId: "E_R1_1", home: eastern[0]?.id, away: eastern[7]?.id },
    { slotId: "E_R1_2", home: eastern[1]?.id, away: eastern[6]?.id },
    { slotId: "E_R1_3", home: eastern[2]?.id, away: eastern[5]?.id },
    { slotId: "E_R1_4", home: eastern[3]?.id, away: eastern[4]?.id },
  ];
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
  // Round 2 (reseeded)
  { slotId: "W_R2_1", round: 2 },
  { slotId: "W_R2_2", round: 2 },
  { slotId: "E_R2_1", round: 2 },
  { slotId: "E_R2_2", round: 2 },
  // Conference Finals (reseeded)
  { slotId: "W_CF", round: 3 },
  { slotId: "E_CF", round: 3 },
  // Stanley Cup Finals
  { slotId: "SCF", round: 4 },
];
