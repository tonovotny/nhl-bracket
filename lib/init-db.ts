import { createClient } from "@libsql/client";
import { allSlots } from "./seed";
import { fetchPlayoffTeams } from "./nhl-api";
import { buildRound1Matchups } from "./seed";

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:nhl-bracket.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Create tables
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      seed INTEGER NOT NULL,
      conference TEXT NOT NULL,
      division TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_by INTEGER REFERENCES users(id),
      lock_time TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS league_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      league_id INTEGER NOT NULL REFERENCES leagues(id),
      user_id INTEGER NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id TEXT NOT NULL UNIQUE,
      round INTEGER NOT NULL,
      home_team_id INTEGER REFERENCES teams(id),
      away_team_id INTEGER REFERENCES teams(id),
      winner_team_id INTEGER REFERENCES teams(id),
      games_played INTEGER,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS brackets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      league_id INTEGER NOT NULL REFERENCES leagues(id),
      submitted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS picks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bracket_id INTEGER NOT NULL REFERENCES brackets(id),
      slot_id TEXT NOT NULL,
      predicted_winner_team_id INTEGER NOT NULL REFERENCES teams(id),
      predicted_games INTEGER
    );
  `);

  // Fetch current playoff teams from NHL API
  const allTeams = await fetchPlayoffTeams();
  const round1Matchups = buildRound1Matchups(allTeams);

  // Seed teams
  for (const team of allTeams) {
    await client.execute({
      sql: "INSERT OR REPLACE INTO teams (id, name, abbreviation, seed, conference) VALUES (?, ?, ?, ?, ?)",
      args: [team.id, team.name, team.abbreviation, team.seed, team.conference],
    });
  }

  // Seed Round 1 series
  for (const matchup of round1Matchups) {
    await client.execute({
      sql: "INSERT OR REPLACE INTO series (slot_id, round, home_team_id, away_team_id, status) VALUES (?, ?, ?, ?, 'pending')",
      args: [matchup.slotId, 1, matchup.home, matchup.away],
    });
  }

  // Seed Round 2+ slots
  for (const slot of allSlots) {
    if (slot.round > 1) {
      await client.execute({
        sql: "INSERT OR REPLACE INTO series (slot_id, round, status) VALUES (?, ?, 'pending')",
        args: [slot.slotId, slot.round],
      });
    }
  }

  console.log(`Seeded ${allTeams.length} teams and ${allSlots.length} series slots.`);
  client.close();
}

main().catch(console.error);
