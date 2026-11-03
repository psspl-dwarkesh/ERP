import type { z } from "zod";
import type { ModuleKey } from "../../../prototype/src/api/types";
import type { Actor, Level } from "../core";
import type { Tx } from "../db/client";

/**
 * A command is one business action: validated input, a permission requirement,
 * and a body that runs inside a single database transaction. Every command
 * writes its own audit event, so the trail reads in business language.
 */
export interface Command<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  module: ModuleKey;
  /** Minimum permission on `module`. Approvals add their own authority check. */
  level: Level;
  input: S;
  run: (ctx: { tx: Tx; actor: Actor }, input: z.output<S>) => Promise<unknown>;
}

export const command = <S extends z.ZodTypeAny>(c: Command<S>) => c as unknown as Command;
