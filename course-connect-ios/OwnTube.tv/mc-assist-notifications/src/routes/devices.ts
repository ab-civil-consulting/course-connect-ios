import { Router } from "express";
import { registerDevice, unregisterDevice } from "../database";

export const devicesRouter = Router();

devicesRouter.post("/register", async (req, res) => {
  try {
    const { expoPushToken, userId, username, backend, platform, deviceId } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({ error: "expoPushToken is required" });
    }

    if (!backend) {
      return res.status(400).json({ error: "backend is required" });
    }

    const device = await registerDevice({
      expoPushToken,
      userId,
      username,
      backend,
      platform: platform || "unknown",
      deviceId,
    });

    console.log(`[Devices] Registered: ${expoPushToken.slice(0, 20)}...`);

    res.json({
      success: true,
      device: {
        id: device.id,
        platform: device.platform,
        createdAt: device.createdAt,
      },
    });
  } catch (error) {
    console.error("[Devices] Registration error:", error);
    res.status(500).json({ error: "Failed to register device" });
  }
});

devicesRouter.post("/unregister", async (req, res) => {
  try {
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({ error: "expoPushToken is required" });
    }

    await unregisterDevice(expoPushToken);

    console.log(`[Devices] Unregistered: ${expoPushToken.slice(0, 20)}...`);

    res.json({ success: true });
  } catch (error) {
    console.error("[Devices] Unregistration error:", error);
    res.status(500).json({ error: "Failed to unregister device" });
  }
});
