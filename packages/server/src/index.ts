import { buildServer } from "./app";
import { env } from "./env";
import { createTableRegistry } from "./tables/tableRegistry";

const { app } = buildServer((transport) => createTableRegistry(transport), {
  logger: true,
});

await app.listen({ port: env.PORT, host: env.HOST });
