import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const board = sqliteTable(
  "board",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled"),
    elements: text("elements").notNull().default("[]"),
    appState: text("app_state").notNull().default("{}"),
    files: text("files"),
    thumbnailDataUrl: text("thumbnail_data_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("board_userId_idx").on(table.userId)],
);

export const boardRelations = relations(board, ({ one }) => ({
  user: one(user, {
    fields: [board.userId],
    references: [user.id],
  }),
}));
