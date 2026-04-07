"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!userName) {
      setError("Enter your name to continue");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    router.push("/bracket");
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

      <div className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Your name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="e.g. Mike T."
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 outline-none focus:border-gray-500"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? "Joining..." : "Enter"}
        </button>
      </div>
    </div>
  );
}
