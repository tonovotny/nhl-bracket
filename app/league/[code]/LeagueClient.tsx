"use client";

import { useState } from "react";
import BracketPicker from "@/app/components/BracketPicker";
import type { PicksMap, GamesMap, TeamSeed, SeriesInfo } from "@/lib/bracket-data";
import type { LeaderboardEntry } from "@/lib/scoring";

type Tab = "bracket" | "leaderboard" | "league";

export default function LeagueClient({
  league,
  currentUser,
  members,
  teams,
  seriesData,
  userPicks,
  userGames,
  leaderboard,
}: {
  league: { name: string; inviteCode: string };
  currentUser: { id: number; name: string } | null;
  members: { userId: number; userName: string }[];
  teams: TeamSeed[];
  seriesData: SeriesInfo[];
  userPicks: PicksMap;
  userGames: GamesMap;
  leaderboard: LeaderboardEntry[];
}) {
  const [tab, setTab] = useState<Tab>("bracket");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave(picks: PicksMap, games: GamesMap, round: number) {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/bracket/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: league.inviteCode,
          picksData: picks,
          gamesData: games,
          round,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error || "Failed to save");
        return;
      }

      setMessage(`${round === 4 ? "Stanley Cup Finals" : round === 3 ? "Conference Finals" : `Round ${round}`} picks saved!`);
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-gray-200">
      <header className="text-center py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold tracking-wide text-white">
          PLAYOFF BRACKET 2026
        </h1>
        <p className="text-sm text-gray-500 mt-1">NHL Stanley Cup Playoffs</p>
        <div className="flex justify-center gap-5 mt-2 text-xs text-gray-500">
          <span>League: {league.name}</span>
          <span>{members.length} members</span>
        </div>
      </header>

      <div className="flex justify-center mt-4">
        <div className="flex border border-gray-700 rounded-lg overflow-hidden">
          {(["bracket", "leaderboard", "league"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm capitalize transition-colors cursor-pointer ${
                tab === t ? "bg-gray-700/80 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "bracket" ? "My Bracket" : t}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="max-w-[1100px] mx-auto mt-4 px-4">
          <div className={`rounded-lg px-4 py-2.5 text-center text-sm ${
            message.includes("saved") ? "bg-emerald-900/30 border border-emerald-700/50 text-emerald-300"
              : "bg-red-900/30 border border-red-700/50 text-red-300"
          }`}>
            {message}
          </div>
        </div>
      )}

      <main className="max-w-[1100px] mx-auto px-4 py-4">
        {tab === "bracket" && (
          <BracketPicker
            teams={teams}
            seriesData={seriesData}
            initialPicks={userPicks}
            initialGames={userGames}
            onSave={currentUser ? handleSave : undefined}
          />
        )}

        {tab === "leaderboard" && (
          <div className="max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-center mb-4">{league.name}</h2>
            {leaderboard.length === 0 ? (
              <p className="text-center text-gray-500 text-sm">
                No picks yet. Leaderboard updates as series complete.
              </p>
            ) : (
              <div className="space-y-0">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center px-4 py-3 border-b border-gray-800 ${
                      i === 0 ? "bg-gray-800/50 rounded-t-lg" : ""
                    }`}
                  >
                    <span className={`w-8 font-bold text-sm ${i === 0 ? "text-amber-400" : "text-gray-600"}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm">
                      {entry.userName}
                      {currentUser && entry.userId === currentUser.id && (
                        <span className="text-emerald-500 text-xs ml-2">(you)</span>
                      )}
                    </span>
                    <span className="text-lg font-bold text-white w-12 text-right">{entry.score}pt</span>
                    <span className="text-xs text-gray-500 w-24 text-right">
                      {entry.correctPicks} correct{entry.exactPicks > 0 && ` (${entry.exactPicks} exact)`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "league" && (
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-center mb-4">League Info</h2>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">Share this code with friends:</p>
              <div className="bg-gray-900 border border-dashed border-gray-600 rounded-lg py-3 text-center font-mono text-2xl tracking-[0.25em] text-white">
                {league.inviteCode}
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                Join at: {typeof window !== "undefined" ? window.location.origin : ""}/league/{league.inviteCode}
              </p>
            </div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Members ({members.length})</h3>
            <div className="space-y-0">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center px-3 py-2 border-b border-gray-800 text-sm">
                  <span>{m.userName}</span>
                  {currentUser && m.userId === currentUser.id && (
                    <span className="text-emerald-500 text-xs ml-2">(you)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
