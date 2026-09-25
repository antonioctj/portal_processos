import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`ProcessAI backend rodando em http://localhost:${env.PORT}`);
});
