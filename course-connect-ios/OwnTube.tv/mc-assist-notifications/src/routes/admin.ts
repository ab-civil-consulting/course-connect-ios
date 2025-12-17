import { Router } from "express";
import { sendAnnouncementNotification, sendNewVideoNotification } from "../expo-push";
import { getActiveDevices, prisma } from "../database";
import { checkForNewVideos } from "../peertube";

export const adminRouter = Router();

// Simple API key authentication middleware
const authenticateAdmin = (req: any, res: any, next: any) => {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    console.warn("[Admin] ADMIN_API_KEY not set in environment");
    return res.status(500).json({ error: "Server configuration error" });
  }

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

adminRouter.use(authenticateAdmin);

// Send manual announcement notification
adminRouter.post("/notify", async (req, res) => {
  try {
    const { title, message, backend } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "title and message are required" });
    }

    const result = await sendAnnouncementNotification(title, message, backend);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Admin] Notification error:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Send notification for specific video
adminRouter.post("/notify-video", async (req, res) => {
  try {
    const { videoId, videoTitle, channelName, backend } = req.body;

    if (!videoId || !videoTitle) {
      return res.status(400).json({ error: "videoId and videoTitle are required" });
    }

    const result = await sendNewVideoNotification({
      videoId,
      videoTitle,
      channelName,
      backend: backend || process.env.PEERTUBE_BACKEND || "course-connect.ab-civil.com",
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Admin] Video notification error:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Trigger manual video check
adminRouter.post("/check-videos", async (req, res) => {
  try {
    await checkForNewVideos();
    res.json({ success: true, message: "Video check completed" });
  } catch (error) {
    console.error("[Admin] Video check error:", error);
    res.status(500).json({ error: "Failed to check for new videos" });
  }
});

// Get statistics
adminRouter.get("/stats", async (req, res) => {
  try {
    const [deviceCount, notificationLogs, recentVideos] = await Promise.all([
      prisma.device.count({ where: { isActive: true } }),
      prisma.notificationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.video.findMany({
        orderBy: { publishedAt: "desc" },
        take: 10,
      }),
    ]);

    res.json({
      activeDevices: deviceCount,
      recentNotifications: notificationLogs,
      recentVideos,
    });
  } catch (error) {
    console.error("[Admin] Stats error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// List all active devices
adminRouter.get("/devices", async (req, res) => {
  try {
    const devices = await getActiveDevices();
    res.json({
      count: devices.length,
      devices: devices.map((d) => ({
        id: d.id,
        username: d.username,
        platform: d.platform,
        backend: d.backend,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[Admin] List devices error:", error);
    res.status(500).json({ error: "Failed to list devices" });
  }
});
