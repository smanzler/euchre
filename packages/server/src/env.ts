import { z } from "zod";

export const env = z
  .object({
    PORT: z.coerce.number().int().default(4000),
    HOST: z.string().default("0.0.0.0"),
  })
  .parse(process.env);
