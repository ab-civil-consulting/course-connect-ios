import express from "express";
import cors from "cors";
import cron from "node-cron";
import dotenv from "dotenv";
import { devicesRouter } from "./routes/devices";
import { adminRouter } from "./routes/admin";
import { checkForNewVideos } from "./peertube";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/devices", devicesRouter);
app.use("/api/admin", adminRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({
    service: "MC Assist Notifications",
    status: "running",
    endpoints: {
      health: "/health",
      devices: "/api/devices",
      admin: "/api/admin"
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Notification server running on port ${PORT}`);
});

// Poll PeerTube for new videos
const POLL_INTERVAL = process.env.POLL_INTERVAL_MINUTES || "5";
cron.schedule(`*/${POLL_INTERVAL} * * * *`, async () => {
  console.log("[Cron] Checking for new videos...");
  try {
    await checkForNewVideos();
  } catch (error) {
    console.error("[Cron] Error checking for new videos:", error);
  }
});

// Initial check on startup (after 10 seconds to let DB connect)
setTimeout(() => {
  console.log("[Startup] Running initial video check...");
  checkForNewVideos().catch(console.error);
}, 10000);
