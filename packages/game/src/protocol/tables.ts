import { z } from "zod";
import { nameSchema, parseWith } from "./messages";
import { parseTagged } from "./tagged";

export const TABLE_CODE_LENGTH = 4;

/** Has no vowels, so that a code does not spell a word. */
export const TABLE_CODE_LETTERS = "BCDFGHJKLMNPQRSTVWXZ";

/** The first message a peer sends to the server, before it has a table. */
export type TableRequest =
  | { t: "create"; tableName: string; name: string }
  | { t: "join"; code: string };

export type TableReply =
  { t: "table"; code: string } | { t: "rejected"; reason: string };

const tableRequestSchema = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("create"),
    tableName: nameSchema,
    name: nameSchema,
  }),
  z.object({
    t: z.literal("join"),
    code: z.string().trim().toUpperCase().length(TABLE_CODE_LENGTH),
  }),
]) satisfies z.ZodType<TableRequest>;

const REPLY_TAGS: readonly TableReply["t"][] = ["table", "rejected"];

export const parseTableRequest = (text: string): TableRequest | null =>
  parseWith(tableRequestSchema, text);

export const parseTableReply = (text: string): TableReply | null =>
  parseTagged<TableReply>(text, REPLY_TAGS);
