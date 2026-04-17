"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getTeamsInSlot,
  getOpenRound,
  getSlotsForRound,
  countPicksForRound,
  totalSlotsForRound,
  makePick,
  type PicksMap,
  type GamesMap,
  type TeamSeed,
  type SeriesInfo,
} from "@/lib/bracket-data";

const FAVORITE_TEAMS: Record<string, string> = {
  SJS: "WYNO",
  PHI: "TOMAS",
};

const ROUND_LABELS: Record<number, string> = {
  1: "Round 1",
  2: "Round 2",
  3: "Conference Finals",
  4: "Stanley Cup Finals",
};

function TeamButton({
  team,
  isPicked,
  isWinner,
  wasPicked,
  wins,
  onClick,
  disabled,
}: {
  team: TeamSeed | null;
  isPicked: boolean;
  isWinner: boolean;
  wasPicked: boolean; // user picked this team on a completed series
  wins: number | null;
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

  // Pick result styling for completed series
  const correctPick = wasPicked && isWinner;
  const wrongPick = wasPicked && !isWinner;
  const favOwner = FAVORITE_TEAMS[team.abbreviation];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 text-sm w-full transition-colors text-left
        ${correctPick
          ? "bg-emerald-900/50 border-l-3 border-emerald-400"
          : wrongPick
            ? "bg-red-900/30 border-l-3 border-red-400"
            : isWinner
              ? "bg-emerald-900/30 border-l-3 border-emerald-400/50"
              : isPicked
                ? "bg-emerald-900/40 border-l-3 border-emerald-500"
                : "border-l-3 border-transparent hover:bg-gray-700/50"
        }
        ${favOwner ? "ring-1 ring-inset ring-yellow-500/40 bg-yellow-900/10" : ""}
        ${disabled ? "cursor-default" : "cursor-pointer"}
      `}
    >
      <span className="text-[9px] text-gray-500 w-6 font-mono">{
        team.wildcardRank ? `WC${team.wildcardRank}` : team.division && team.divisionRank ? `${team.division}${team.divisionRank}` : team.seed
      }</span>
      <img
        src={`https://assets.nhle.com/logos/nhl/svg/${team.abbreviation}_dark.svg`}
        alt={team.abbreviation}
        className="w-5 h-5 shrink-0"
      />
      <span className={`truncate ${
        correctPick ? "font-semibold text-emerald-300" : wrongPick ? "text-red-300 line-through" : isWinner ? "font-semibold text-emerald-300" : ""
      }`}>{team.abbreviation}</span>
      {favOwner && (
        <span className="text-[9px] text-yellow-400/70 uppercase tracking-wide">{favOwner}</span>
      )}
      {wins !== null && (
        <span className={`ml-auto text-xs font-bold tabular-nums ${
          isWinner ? "text-emerald-400" : wins > 0 ? "text-gray-300" : "text-gray-600"
        }`}>
          {wins}
        </span>
      )}
    </button>
  );
}

function GamesSelector({
  selectedGames,
  actualGames,
  onSelect,
  disabled,
}: {
  selectedGames: number | undefined;
  actualGames?: number | null;
  onSelect: (games: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-900/50">
      <span className="text-[10px] text-gray-500 mr-1">in</span>
      {[4, 5, 6, 7].map((g) => {
        const isSelected = selectedGames === g;
        const isActual = actualGames === g;
        const isCorrect = isSelected && isActual;
        const isWrongPick = isSelected && actualGames != null && !isActual;
        return (
          <button
            key={g}
            onClick={() => onSelect(g)}
            disabled={disabled}
            className={`w-6 h-6 rounded text-[11px] font-medium transition-colors
              ${isCorrect
                ? "bg-amber-600 text-white ring-1 ring-amber-400"
                : isWrongPick
                  ? "bg-red-800/70 text-red-300 ring-1 ring-red-500/50"
                  : isActual
                    ? "bg-emerald-800/50 text-emerald-300 ring-1 ring-emerald-500/50"
                    : isSelected
                      ? "bg-amber-600 text-white"
                      : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50"
              }
              ${disabled ? "cursor-default" : "cursor-pointer"}
            `}
          >
            {g}
          </button>
        );
      })}
      <span className="text-[10px] text-amber-500/70 ml-1">3x</span>
    </div>
  );
}

function Matchup({
  slotId,
  teams,
  seriesMap,
  picks,
  games,
  onPick,
  onGames,
  canBet,
}: {
  slotId: string;
  teams: TeamSeed[];
  seriesMap: Record<string, SeriesInfo>;
  picks: PicksMap;
  games: GamesMap;
  onPick: (slotId: string, teamId: number) => void;
  onGames: (slotId: string, numGames: number) => void;
  canBet: boolean;
}) {
  const [team1, team2] = getTeamsInSlot(teams, slotId, seriesMap);
  const s = seriesMap[slotId];
  const isComplete = s?.status === "complete";
  const isActive = s?.status === "active";
  const showWins = isActive || isComplete;
  const currentPick = picks[slotId];
  const hasPick = currentPick !== undefined;
  const pickCorrect = isComplete && hasPick && currentPick === s?.winnerTeamId;
  const pickWrong = isComplete && hasPick && currentPick !== s?.winnerTeamId;
  const exactBonus = pickCorrect && games[slotId] === s?.gamesPlayed;

  return (
    <div className={`bg-gray-800/80 border rounded-lg overflow-hidden my-1.5 min-w-[160px] ${
      exactBonus ? "border-amber-500/70" : pickCorrect ? "border-emerald-500/60" : pickWrong ? "border-red-500/50" : isComplete ? "border-gray-600" : isActive ? "border-blue-700/50" : "border-gray-700"
    }`}>
      {/* Active series indicator */}
      {isActive && (
        <div className="text-[9px] text-blue-400 text-center py-0.5 bg-blue-900/20 uppercase tracking-wider">
          In Progress
        </div>
      )}
      <TeamButton
        team={team1}
        isPicked={canBet && currentPick === team1?.id}
        isWinner={isComplete && s?.winnerTeamId === team1?.id}
        wasPicked={isComplete && hasPick && currentPick === team1?.id}
        wins={showWins ? (s?.homeTeamWins ?? 0) : null}
        onClick={() => team1 && onPick(slotId, team1.id)}
        disabled={!canBet || !team1}
      />
      <div className="h-px bg-gray-700" />
      <TeamButton
        team={team2}
        isPicked={canBet && currentPick === team2?.id}
        isWinner={isComplete && s?.winnerTeamId === team2?.id}
        wasPicked={isComplete && hasPick && currentPick === team2?.id}
        wins={showWins ? (s?.awayTeamWins ?? 0) : null}
        onClick={() => team2 && onPick(slotId, team2.id)}
        disabled={!canBet || !team2}
      />
      {/* Completed series result with pick indicator */}
      {isComplete && s?.gamesPlayed && (
        <div className={`text-[10px] text-center py-1 ${
          hasPick
            ? currentPick === s.winnerTeamId
              ? games[slotId] === s.gamesPlayed
                ? "bg-amber-900/40 text-amber-400"
                : "bg-emerald-900/30 text-emerald-400"
              : "bg-red-900/30 text-red-400"
            : "bg-gray-900/50 text-gray-500"
        }`}>
          {hasPick ? (
            currentPick === s.winnerTeamId ? (
              games[slotId] === s.gamesPlayed ? (
                <span>✓ Won in {s.gamesPlayed} · <span className="font-bold">+3pts</span></span>
              ) : (
                <span>✓ Won in {s.gamesPlayed} · +1pt</span>
              )
            ) : (
              <span>✗ Won in {s.gamesPlayed}</span>
            )
          ) : (
            <span>Won in {s.gamesPlayed}</span>
          )}
        </div>
      )}
      {/* Games selector */}
      {((canBet && hasPick) || (isComplete && hasPick)) && (
        <>
          <div className="h-px bg-gray-700" />
          <GamesSelector
            selectedGames={games[slotId]}
            actualGames={isComplete ? s?.gamesPlayed : null}
            onSelect={(g) => onGames(slotId, g)}
            disabled={!canBet}
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
  seriesMap,
  picks,
  games,
  onPick,
  onGames,
  openRound,
}: {
  label: string;
  slots: string[];
  teams: TeamSeed[];
  seriesMap: Record<string, SeriesInfo>;
  picks: PicksMap;
  games: GamesMap;
  onPick: (slotId: string, teamId: number) => void;
  onGames: (slotId: string, numGames: number) => void;
  openRound: number;
}) {
  return (
    <div className="flex flex-col justify-around min-w-[175px] px-1">
      <div className="text-center text-[11px] text-gray-500 uppercase tracking-widest mb-2 font-medium">
        {label}
      </div>
      {slots.map((slotId) => {
        const s = seriesMap[slotId];
        const round = s?.round ?? 0;
        const canBet = round === openRound;
        return (
          <Matchup
            key={slotId}
            slotId={slotId}
            teams={teams}
            seriesMap={seriesMap}
            picks={picks}
            games={games}
            onPick={onPick}
            onGames={onGames}
            canBet={canBet}
          />
        );
      })}
    </div>
  );
}

function useDaysLeft(lockTime: string | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!lockTime) return;

    function compute() {
      const now = new Date();
      const lock = new Date(lockTime!);
      const diff = lock.getTime() - now.getTime();
      if (diff <= 0) {
        setLabel(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 1) {
        setLabel(`${days}d left`);
      } else if (days === 1) {
        setLabel(`1d ${hours}h left`);
      } else {
        setLabel(`${hours}h left`);
      }
    }

    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [lockTime]);

  return label;
}

export default function BracketPicker({
  teams,
  seriesData,
  initialPicks,
  initialGames,
  onSave,
  lockTime,
}: {
  teams: TeamSeed[];
  seriesData: SeriesInfo[];
  initialPicks?: PicksMap;
  initialGames?: GamesMap;
  onSave?: (picks: PicksMap, games: GamesMap, round: number) => void;
  lockTime?: string;
}) {
  const [picks, setPicks] = useState<PicksMap>(initialPicks ?? {});
  const [games, setGames] = useState<GamesMap>(initialGames ?? {});

  const seriesMap: Record<string, SeriesInfo> = {};
  for (const s of seriesData) {
    seriesMap[s.slotId] = s;
  }

  const openRound = getOpenRound(seriesMap);

  const handlePick = useCallback((slotId: string, teamId: number) => {
    setPicks((prevPicks) => {
      const result = makePick(slotId, teamId, prevPicks, games);
      setGames(result.games);
      return result.picks;
    });
  }, [games]);

  const handleGames = useCallback((slotId: string, numGames: number) => {
    setGames((prev) => ({ ...prev, [slotId]: numGames }));
  }, []);

  const roundPicks = openRound > 0 ? countPicksForRound(picks, openRound) : 0;
  const roundTotal = openRound > 0 ? totalSlotsForRound(openRound) : 0;
  const roundComplete = roundPicks === roundTotal;
  const daysLeft = useDaysLeft(openRound > 0 ? lockTime : undefined);

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between px-2 py-2 mb-3 text-sm text-gray-400">
        {openRound > 0 ? (
          <div className="flex gap-4 items-center">
            <span>
              {ROUND_LABELS[openRound]}: <span className={roundComplete ? "text-emerald-400 font-medium" : "text-gray-300"}>{roundPicks}/{roundTotal}</span>
            </span>
            {daysLeft && (
              <span className="text-amber-400 text-xs font-medium">
                {daysLeft}
              </span>
            )}
            <span className="text-[10px] text-gray-600 self-center">
              1pt correct winner &middot; 3pt exact result
            </span>
          </div>
        ) : (
          <span className="text-gray-500">No round open for betting right now</span>
        )}
        {onSave && openRound > 0 && (
          <button
            onClick={() => onSave(picks, games, openRound)}
            disabled={!roundComplete}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${roundComplete
                ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
          >
            {roundComplete ? `Submit ${ROUND_LABELS[openRound]}` : `Pick all ${ROUND_LABELS[openRound]} winners`}
          </button>
        )}
      </div>

      {/* Bracket grid */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-0 min-w-[900px] items-stretch">
          <RoundColumn label="Round 1" slots={["W_R1_1", "W_R1_2", "W_R1_3", "W_R1_4"]}
            teams={teams} seriesMap={seriesMap} picks={picks} games={games} onPick={handlePick} onGames={handleGames} openRound={openRound} />
          <RoundColumn label="Round 2" slots={["W_R2_1", "W_R2_2"]}
            teams={teams} seriesMap={seriesMap} picks={picks} games={games} onPick={handlePick} onGames={handleGames} openRound={openRound} />
          <RoundColumn label="West Final" slots={["W_CF"]}
            teams={teams} seriesMap={seriesMap} picks={picks} games={games} onPick={handlePick} onGames={handleGames} openRound={openRound} />

          {/* Stanley Cup Finals */}
          <div className="flex flex-col items-center justify-center min-w-[180px] px-2">
            <div className="text-center text-[11px] text-gray-500 uppercase tracking-widest mb-2 font-medium">Stanley Cup</div>
            <div className="text-3xl mb-2">🏆</div>
            <Matchup slotId="SCF" teams={teams} seriesMap={seriesMap} picks={picks} games={games}
              onPick={handlePick} onGames={handleGames} canBet={openRound === 4} />
          </div>

          <RoundColumn label="East Final" slots={["E_CF"]}
            teams={teams} seriesMap={seriesMap} picks={picks} games={games} onPick={handlePick} onGames={handleGames} openRound={openRound} />
          <RoundColumn label="Round 2" slots={["E_R2_1", "E_R2_2"]}
            teams={teams} seriesMap={seriesMap} picks={picks} games={games} onPick={handlePick} onGames={handleGames} openRound={openRound} />
          <RoundColumn label="Round 1" slots={["E_R1_1", "E_R1_2", "E_R1_3", "E_R1_4"]}
            teams={teams} seriesMap={seriesMap} picks={picks} games={games} onPick={handlePick} onGames={handleGames} openRound={openRound} />
        </div>
      </div>
    </div>
  );
}
