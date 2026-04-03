"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"join" | "create" | null>(null);
  const [userName, setUserName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!userName || !inviteCode) {
      setError("Name and invite code are required");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/league/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, inviteCode: inviteCode.toUpperCase() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to join");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/league/${data.inviteCode}`);
  }

  async function handleCreate() {
    if (!userName || !leagueName) {
      setError("Your name and league name are required");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/league/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, leagueName }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create league");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/league/${data.inviteCode}`);
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-gray-200 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🏒</div>
        <h1 className="text-3xl font-bold tracking-wide text-white">
          PLAYOFF BRACKET 2026
        </h1>
        <p className="text-gray-500 mt-2">NHL Stanley Cup Playoffs</p>
      </div>

      <div className="w-full max-w-sm">
        {mode === null && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("join")}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Join a League
            </button>
            <button
              onClick={() => setMode("create")}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Create a League
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Join a League</h2>
            <p className="text-sm text-gray-500 text-center">Enter the invite code your friend shared</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Your name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Mike T."
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Invite code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. BEER26"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono tracking-wider placeholder:text-gray-600 outline-none focus:border-gray-500"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join League"}
            </button>
            <button
              onClick={() => { setMode(null); setError(""); }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Create a League</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">League name</label>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="e.g. Beer League Legends"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Your name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Mike T."
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 outline-none focus:border-gray-500"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create League"}
            </button>
            <button
              onClick={() => { setMode(null); setError(""); }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 cursor-pointer"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
