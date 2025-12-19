import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const registerDevice = async (data: {
  expoPushToken: string;
  userId?: number;
  username?: string;
  backend: string;
  platform: string;
  deviceId?: string;
}) => {
  return prisma.device.upsert({
    where: { expoPushToken: data.expoPushToken },
    update: {
      userId: data.userId,
      username: data.username,
      backend: data.backend,
      platform: data.platform,
      deviceId: data.deviceId,
      isActive: true,
      updatedAt: new Date(),
    },
    create: data,
  });
};

export const unregisterDevice = async (expoPushToken: string) => {
  // Use updateMany to avoid error if device doesn't exist
  return prisma.device.updateMany({
    where: { expoPushToken },
    data: { isActive: false },
  });
};

export const getActiveDevices = async (backend?: string) => {
  return prisma.device.findMany({
    where: {
      isActive: true,
      ...(backend && { backend }),
    },
  });
};

export const removeInvalidTokens = async (tokens: string[]) => {
  return prisma.device.deleteMany({
    where: { expoPushToken: { in: tokens } },
  });
};

export const getLastNotifiedVideo = async () => {
  return prisma.video.findFirst({
    where: { notifiedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
  });
};

export const saveVideo = async (data: { uuid: string; name: string; channelName?: string; publishedAt: Date }) => {
  return prisma.video.upsert({
    where: { uuid: data.uuid },
    update: {},
    create: data,
  });
};

export const markVideoNotified = async (uuid: string) => {
  return prisma.video.update({
    where: { uuid },
    data: { notifiedAt: new Date() },
  });
};

export const hasBeenNotified = async (uuid: string): Promise<boolean> => {
  const video = await prisma.video.findUnique({
    where: { uuid },
    select: { notifiedAt: true },
  });
  return video !== null && video.notifiedAt !== null;
};

export const logNotification = async (data: {
  type: string;
  title: string;
  body: string;
  data?: object;
  sentTo: number;
  successful: number;
  failed: number;
}) => {
  return prisma.notificationLog.create({ data });
};
