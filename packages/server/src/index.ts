import { buildServer } from "./app";
import { env } from "./env";

const { app } = buildServer(
  {
    onPeerJoin: (peer) => app.log.info({ peer }, "peer joined"),
    onPeerLeave: (peer) => app.log.info({ peer }, "peer left"),
    onMessage: (peer, text) => app.log.debug({ peer, text }, "peer message"),
  },
  { logger: true },
);

await app.listen({ port: env.PORT, host: env.HOST });
