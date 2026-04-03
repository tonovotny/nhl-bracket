"use client";

import { useState, useCallback } from "react";
import {
  getTeamsInSlot,
  makePick,
  countPicks,
  TOTAL_PICKS,
  type PicksMap,
  type GamesMap,
  type TeamSeed,
} from "@/lib/bracket-data";

// Team colors (approximate primary colors)
const teamColors: Record<string, string> = {
  WPG: "#041E42", DAL: "#006847", VGK: "#B4975A", EDM: "#FF4C00",
  MIN: "#154734", LAK: "#111111", COL: "#6F263D", VAN: "#00205B",
  WSH: "#C8102E", TOR: "#00205B", FLA: "#C8102E", CAR: "#CC0000",
  NJD: "#CE1126", TBL: "#002868", OTT: "#C52032", MTL: "#AF1E2D",
};

function TeamButton({
  team,
  isPicked,
  onClick,
  disabled,
}: {
  team: TeamSeed | null;
  isPicked: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-800/50 border-l-3 border-transparent">
        <span className="text-xs text-gray-700 w-4">-</span>
        <span className="text-gray-600 italic">TBD</span>
      </div>
    );
  }

  const color = teamColors[team.abbreviation] || "#333";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 text-sm w-full transition-colors text-left
        ${isPicked
          ? "bg-emerald-900/40 border-l-3 border-emerald-500"
          : "border-l-3 border-transparent hover:bg-gray-700/50"
        }
        ${disabled ? "cursor-default" : "cursor-pointer"}
      `}
    >
      <span className="text-xs text-gray-500 w-4">{team.seed}</span>
      <span
        className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
        style={{ backgroundColor: color }}
      >
        {team.abbreviation.slice(0, 3)}
      </span>
      <span className="truncate">{team.name}</span>
    </button>
  );
}

function GamesSelector({
  selectedGames,
  onSelect,
  disabled,
}: {
  selectedGames: number | undefined;
  onSelect: (games: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-900/50">
      <span className="text-[10px] text-gray-500 mr-1">in</span>
      {[4, 5, 6, 7].map((g) => (
        <button
          key={g}
          onClick={() => onSelect(g)}
          disabled={disabled}
          className={`w-6 h-6 rounded text-[11px] font-medium transition-colors
            ${selectedGames === g
              ? "bg-amber-600 text-white"
              : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50"
            }
            ${disabled ? "cursor-default" : "cursor-pointer"}
          `}
        >
          {g}
        </button>
      ))}
      <span className="text-[10px] text-amber-500/70 ml-1">3x</span>
    </div>
  );
}

function Matchup({
  slotId,
  teams,
  picks,
  games,
  onPick,
  onGames,
  locked,
}: {
  slotId: string;
  teams: TeamSeed[];
  picks: PicksMap;
  games: GamesMap;
  onPick: (slotId: string, teamId: number) => void;
  onGames: (slotId: string, numGames: number) => void;
  locked: boolean;
}) {
  const [team1, team2] = getTeamsInSlot(teams, slotId, picks);
  const currentPick = picks[slotId];
  const hasPick = currentPick !== undefined;

  return (
    <div className="bg-gray-800/80 border border-gray-700 rounded-lg overflow-hidden my-1.5 min-w-[160px]">
      <TeamButton
        team={team1}
        isPicked={currentPick === team1?.id}
        onClick={() => team1 && onPick(slotId, team1.id)}
        disabled={locked || !team1}
      />
      <div className="h-px bg-gray-700" />
      <TeamButton
        team={team2}
        isPicked={currentPick === team2?.id}
        onClick={() => team2 && onPick(slotId, team2.id)}
        disabled={locked || !team2}
      />
      {hasPick && (
        <>
          <div className="h-px bg-gray-700" />
          <GamesSelector
            selectedGames={games[slotId]}
            onSelect={(g) => onGames(slotId, g)}
            disabled={locked}
          />
        </>
      )}
    </div>
  );
}

function RoundColumn({
  label,
  slots,
  teams,
  picks,
  games,
  onPick,
  onGames,
  locked,
}: {
  label: string;
  slots: string[];
  teams: TeamSeed[];
  picks: PicksMap;
  games: GamesMap;
  onPick: (slotId: string, teamId: number) => void;
  onGames: (slotId: string, numGames: number) => void;
  locked: boolean;
}) {
  return (
    <div className="flex flex-col justify-around min-w-[175px] px-1">
      <div className="text-center text-[11px] text-gray-500 uppercase tracking-widest mb-2 font-medium">
        {label}
      </div>
      {slots.map((slotId) => (
        <Matchup key={slotId} slotId={slotId} teams={teams} picks={picks} games={games} onPick={onPick} onGames={onGames} locked={locked} />
      ))}
    </div>
  );
}

export default function BracketPicker({
  teams,
  initialPicks,
  initialGames,
  locked,
  onSave,
}: {
  teams: TeamSeed[];
  initialPicks?: PicksMap;
  initialGames?: GamesMap;
  locked?: boolean;
  onSave?: (picks: PicksMap, games: GamesMap) => void;
}) {
  const [picks, setPicks] = useState<PicksMap>(initialPicks ?? {});
  const [games, setGames] = useState<GamesMap>(initialGames ?? {});
  const isLocked = locked ?? false;

  const handlePick = useCallback((slotId: string, teamId: number) => {
    if (isLocked) return;
    setPicks((prevPicks) => {
      const result = makePick(slotId, teamId, prevPicks, games);
      setGames(result.games);
      return result.picks;
    });
  }, [isLocked, games]);

  const handleGames = useCallback((slotId: string, numGames: number) => {
    if (isLocked) return;
    setGames((prev) => ({ ...prev, [slotId]: numGames }));
  }, [isLocked]);

  const picksCount = countPicks(picks);
  const gamesCount = Object.keys(games).length;
  const isComplete = picksCount === TOTAL_PICKS;
  const allGamesSet = gamesCount === TOTAL_PICKS;

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between px-2 py-2 mb-3 text-sm text-gray-400">
        <div className="flex gap-4">
          <span>
            Winners: <span className={isComplete ? "text-emerald-400 font-medium" : "text-gray-300"}>{picksCount}/{TOTAL_PICKS}</span>
          </span>
          <span>
            Games: <span className={allGamesSet ? "text-amber-400 font-medium" : "text-gray-300"}>{gamesCount}/{TOTAL_PICKS}</span>
            <span className="text-[10px] text-gray-600 ml-1">(optional, 3x bonus)</span>
          </span>
        </div>
        {onSave && (
          <button
            onClick={() => onSave(picks, games)}
            disabled={!isComplete || isLocked}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${isComplete && !isLocked
                ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
          >
            {isLocked ? "Locked" : isComplete ? "Submit Bracket" : "Pick all winners"}
          </button>
        )}
      </div>

      {/* Scoring info */}
      <div className="px-2 mb-3 text-[11px] text-gray-600">
        1pt per correct winner &middot; 3pt if you also nail the exact games (4/5/6/7)
      </div>

      {/* Bracket grid */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-0 min-w-[900px] items-stretch">
          {/* Western Conference */}
          <RoundColumn
            label="Round 1"
            slots={["W_R1_1", "W_R1_2", "W_R1_3", "W_R1_4"]}
            teams={teams}
            picks={picks}
            games={games}
            onPick={handlePick}
            onGames={handleGames}
            locked={isLocked}
          />
          <RoundColumn
            label="Round 2"
            slots={["W_R2_1", "W_R2_2"]}
            teams={teams}
            picks={picks}
            games={games}
            onPick={handlePick}
            onGames={handleGames}
            locked={isLocked}
          />
          <RoundColumn
            label="West Final"
            slots={["W_CF"]}
            teams={teams}
            picks={picks}
            games={games}
            onPick={handlePick}
            onGames={handleGames}
            locked={isLocked}
          />

          {/* Stanley Cup Finals (center) */}
          <div className="flex flex-col items-center justify-center min-w-[180px] px-2">
            <div className="text-center text-[11px] text-gray-500 uppercase tracking-widest mb-2 font-medium">
              Stanley Cup
            </div>
            <div className="text-3xl mb-2">🏆</div>
            <Matchup slotId="SCF" teams={teams} picks={picks} games={games} onPick={handlePick} onGames={handleGames} locked={isLocked} />
          </div>

          {/* Eastern Conference (mirrored) */}
          <RoundColumn
            label="East Final"
            slots={["E_CF"]}
            teams={teams}
            picks={picks}
            games={games}
            onPick={handlePick}
            onGames={handleGames}
            locked={isLocked}
          />
          <RoundColumn
            label="Round 2"
            slots={["E_R2_1", "E_R2_2"]}
            teams={teams}
            picks={picks}
            games={games}
            onPick={handlePick}
            onGames={handleGames}
            locked={isLocked}
          />
          <RoundColumn
            label="Round 1"
            slots={["E_R1_1", "E_R1_2", "E_R1_3", "E_R1_4"]}
            teams={teams}
            picks={picks}
            games={games}
            onPick={handlePick}
            onGames={handleGames}
            locked={isLocked}
          />
        </div>
      </div>
    </div>
  );
}
