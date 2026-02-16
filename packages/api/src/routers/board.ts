import { ORPCError } from "@orpc/server";
import { db } from "@zentis/db";
import { board } from "@zentis/db/schema/board";
import { nanoid } from "nanoid";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const boardRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const boards = await db
      .select({
        id: board.id,
        title: board.title,
        thumbnailDataUrl: board.thumbnailDataUrl,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      })
      .from(board)
      .where(eq(board.userId, context.session.user.id))
      .orderBy(desc(board.updatedAt));
    return boards;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const [found] = await db
        .select()
        .from(board)
        .where(
          and(eq(board.id, input.id), eq(board.userId, context.session.user.id)),
        );
      if (!found) {
        throw new ORPCError("NOT_FOUND", { message: "Board not found" });
      }
      return found;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const id = nanoid();
      const now = new Date();
      await db.insert(board).values({
        id,
        userId: context.session.user.id,
        title: input.title ?? "Untitled",
        elements: "[]",
        appState: "{}",
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        elements: z.string().optional(),
        appState: z.string().optional(),
        files: z.string().nullable().optional(),
        thumbnailDataUrl: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { id, ...updates } = input;
      const setFields: Record<string, unknown> = {};
      if (updates.title !== undefined) setFields.title = updates.title;
      if (updates.elements !== undefined) setFields.elements = updates.elements;
      if (updates.appState !== undefined) setFields.appState = updates.appState;
      if (updates.files !== undefined) setFields.files = updates.files;
      if (updates.thumbnailDataUrl !== undefined)
        setFields.thumbnailDataUrl = updates.thumbnailDataUrl;

      if (Object.keys(setFields).length === 0) return { success: true };

      await db
        .update(board)
        .set(setFields)
        .where(
          and(eq(board.id, id), eq(board.userId, context.session.user.id)),
        );
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      await db
        .delete(board)
        .where(
          and(
            eq(board.id, input.id),
            eq(board.userId, context.session.user.id),
          ),
        );
      return { success: true };
    }),
};
