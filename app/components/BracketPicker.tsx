"use client";

import { useState, useCallback } from "react";
import {
  getTeamsInSlot,
  makePick,
  countPicks,
  TOTAL_PICKS,
  type PicksMap,
} from "@/lib/bracket-data";
import type { TeamSeed } from "@/lib/seed";

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

function Matchup({
  slotId,
  picks,
  onPick,
  locked,
}: {
  slotId: string;
  picks: PicksMap;
  onPick: (slotId: string, teamId: number) => void;
  locked: boolean;
}) {
  const [team1, team2] = getTeamsInSlot(slotId, picks);
  const currentPick = picks[slotId];

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
    </div>
  );
}

function RoundColumn({
  label,
  slots,
  picks,
  onPick,
  locked,
}: {
  label: string;
  slots: string[];
  picks: PicksMap;
  onPick: (slotId: string, teamId: number) => void;
  locked: boolean;
}) {
  return (
    <div className="flex flex-col justify-around min-w-[175px] px-1">
      <div className="text-center text-[11px] text-gray-500 uppercase tracking-widest mb-2 font-medium">
        {label}
      </div>
      {slots.map((slotId) => (
        <Matchup key={slotId} slotId={slotId} picks={picks} onPick={onPick} locked={locked} />
      ))}
    </div>
  );
}

export default function BracketPicker({
  initialPicks,
  locked,
  onSave,
}: {
  initialPicks?: PicksMap;
  locked?: boolean;
  onSave?: (picks: PicksMap) => void;
}) {
  const [picks, setPicks] = useState<PicksMap>(initialPicks ?? {});
  const isLocked = locked ?? false;

  const handlePick = useCallback((slotId: string, teamId: number) => {
    if (isLocked) return;
    setPicks((prev) => makePick(slotId, teamId, prev));
  }, [isLocked]);

  const picksCount = countPicks(picks);
  const isComplete = picksCount === TOTAL_PICKS;

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between px-2 py-2 mb-3 text-sm text-gray-400">
        <span>
          Picks: <span className={isComplete ? "text-emerald-400 font-medium" : "text-gray-300"}>{picksCount}/{TOTAL_PICKS}</span>
        </span>
        {onSave && (
          <button
            onClick={() => onSave(picks)}
            disabled={!isComplete || isLocked}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${isComplete && !isLocked
                ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
          >
            {isLocked ? "Locked" : isComplete ? "Submit Bracket" : "Complete all picks"}
          </button>
        )}
      </div>

      {/* Bracket grid */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-0 min-w-[900px] items-stretch">
          {/* Western Conference */}
          <RoundColumn
            label="Round 1"
            slots={["W_R1_1", "W_R1_2", "W_R1_3", "W_R1_4"]}
            picks={picks}
            onPick={handlePick}
            locked={isLocked}
          />
          <RoundColumn
            label="Round 2"
            slots={["W_R2_1", "W_R2_2"]}
            picks={picks}
            onPick={handlePick}
            locked={isLocked}
          />
          <RoundColumn
            label="West Final"
            slots={["W_CF"]}
            picks={picks}
            onPick={handlePick}
            locked={isLocked}
          />

          {/* Stanley Cup Finals (center) */}
          <div className="flex flex-col items-center justify-center min-w-[180px] px-2">
            <div className="text-center text-[11px] text-gray-500 uppercase tracking-widest mb-2 font-medium">
              Stanley Cup
            </div>
            <div className="text-3xl mb-2">🏆</div>
            <Matchup slotId="SCF" picks={picks} onPick={handlePick} locked={isLocked} />
          </div>

          {/* Eastern Conference (mirrored) */}
          <RoundColumn
            label="East Final"
            slots={["E_CF"]}
            picks={picks}
            onPick={handlePick}
            locked={isLocked}
          />
          <RoundColumn
            label="Round 2"
            slots={["E_R2_1", "E_R2_2"]}
            picks={picks}
            onPick={handlePick}
            locked={isLocked}
          />
          <RoundColumn
            label="Round 1"
            slots={["E_R1_1", "E_R1_2", "E_R1_3", "E_R1_4"]}
            picks={picks}
            onPick={handlePick}
            locked={isLocked}
          />
        </div>
      </div>
    </div>
  );
}
