import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  seed: integer("seed").notNull(),
  conference: text("conference").notNull(), // "W" or "E"
  division: text("division"),
});

export const leagues = sqliteTable("leagues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: integer("created_by").references(() => users.id),
  lockTime: text("lock_time").notNull(), // ISO datetime string
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  image: text("image"),
  googleId: text("google_id").unique(),
  token: text("token").unique(),
  createdAt: text("created_at").notNull(),
});

export const leagueMembers = sqliteTable("league_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leagueId: integer("league_id")
    .notNull()
    .references(() => leagues.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
});

export const series = sqliteTable("series", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slotId: text("slot_id").notNull().unique(), // e.g. W_R1_1, E_CF, SCF
  round: integer("round").notNull(), // 1, 2, 3, 4
  homeTeamId: integer("home_team_id").references(() => teams.id),
  awayTeamId: integer("away_team_id").references(() => teams.id),
  winnerTeamId: integer("winner_team_id").references(() => teams.id),
  homeTeamWins: integer("home_team_wins").notNull().default(0),
  awayTeamWins: integer("away_team_wins").notNull().default(0),
  gamesPlayed: integer("games_played"),
  status: text("status").notNull().default("pending"), // pending, active, complete
});

export const brackets = sqliteTable("brackets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  leagueId: integer("league_id")
    .notNull()
    .references(() => leagues.id),
  submittedAt: text("submitted_at"),
});

export const picks = sqliteTable("picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bracketId: integer("bracket_id")
    .notNull()
    .references(() => brackets.id),
  slotId: text("slot_id").notNull(), // references series.slotId
  predictedWinnerTeamId: integer("predicted_winner_team_id")
    .notNull()
    .references(() => teams.id),
  predictedGames: integer("predicted_games"), // 4, 5, 6, or 7
});
