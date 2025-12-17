import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { getActiveDevices, removeInvalidTokens, logNotification } from "./database";

const expo = new Expo();

interface NotificationPayload {
  title: string;
  body: string;
  data: {
    type: "new_video" | "announcement";
    videoId?: string;
    videoTitle?: string;
    channelName?: string;
    backend?: string;
  };
}

export const sendPushNotifications = async (
  payload: NotificationPayload,
  backend?: string
): Promise<{ successful: number; failed: number }> => {
  const devices = await getActiveDevices(backend);

  if (devices.length === 0) {
    console.log("[ExpoPush] No active devices to notify");
    return { successful: 0, failed: 0 };
  }

  const validTokens = devices
    .map((d) => d.expoPushToken)
    .filter((token) => Expo.isExpoPushToken(token));

  if (validTokens.length === 0) {
    console.log("[ExpoPush] No valid Expo push tokens found");
    return { successful: 0, failed: 0 };
  }

  console.log(`[ExpoPush] Sending to ${validTokens.length} device(s)`);

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data,
    priority: "high",
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const invalidTokens: string[] = [];
  let successful = 0;
  let failed = 0;

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);

      tickets.forEach((ticket, index) => {
        if (ticket.status === "ok") {
          successful++;
        } else {
          failed++;
          if (
            ticket.details?.error === "DeviceNotRegistered" ||
            ticket.details?.error === "InvalidCredentials"
          ) {
            invalidTokens.push(chunk[index].to as string);
          }
        }
      });
    } catch (error) {
      console.error("[ExpoPush] Error sending chunk:", error);
      failed += chunk.length;
    }
  }

  if (invalidTokens.length > 0) {
    console.log(`[ExpoPush] Removing ${invalidTokens.length} invalid token(s)`);
    await removeInvalidTokens(invalidTokens);
  }

  await logNotification({
    type: payload.data.type,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sentTo: validTokens.length,
    successful,
    failed,
  });

  console.log(`[ExpoPush] Sent: ${successful} successful, ${failed} failed`);
  return { successful, failed };
};

export const sendNewVideoNotification = async (video: {
  videoId: string;
  videoTitle: string;
  channelName?: string;
  backend: string;
}): Promise<{ successful: number; failed: number }> => {
  const channelPrefix = video.channelName ? `${video.channelName}: ` : "";

  return sendPushNotifications(
    {
      title: "New Video Available",
      body: `${channelPrefix}${video.videoTitle}`,
      data: {
        type: "new_video",
        videoId: video.videoId,
        videoTitle: video.videoTitle,
        channelName: video.channelName,
        backend: video.backend,
      },
    },
    video.backend
  );
};

export const sendAnnouncementNotification = async (
  title: string,
  message: string,
  backend?: string
): Promise<{ successful: number; failed: number }> => {
  return sendPushNotifications(
    {
      title,
      body: message,
      data: {
        type: "announcement",
        backend,
      },
    },
    backend
  );
};
