import "express-async-errors";
import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./lib/socket";

const app = createApp();
const httpServer = createServer(app);

// Initialize Socket.IO on the same HTTP server
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`[NiChan] HTTP + WebSocket listening on port ${env.port}`);
  console.log(`[NiChan] Environment: ${env.nodeEnv}`);
});
