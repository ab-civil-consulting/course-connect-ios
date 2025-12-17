import axios from "axios";
import { getLastNotifiedVideo, saveVideo, markVideoNotified } from "./database";
import { sendNewVideoNotification } from "./expo-push";

const PEERTUBE_BACKEND = process.env.PEERTUBE_BACKEND || "course-connect.ab-civil.com";
const PEERTUBE_API_URL = `https://${PEERTUBE_BACKEND}/api/v1`;

interface PeerTubeVideo {
  uuid: string;
  name: string;
  publishedAt: string;
  channel?: {
    name: string;
    displayName: string;
  };
}

interface PeerTubeResponse {
  total: number;
  data: PeerTubeVideo[];
}

export const fetchLatestVideos = async (count = 10): Promise<PeerTubeVideo[]> => {
  try {
    const response = await axios.get<PeerTubeResponse>(`${PEERTUBE_API_URL}/search/videos`, {
      params: {
        start: 0,
        count,
        sort: "-publishedAt",
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("[PeerTube] Failed to fetch videos:", error);
    throw error;
  }
};

export const checkForNewVideos = async (): Promise<void> => {
  try {
    const videos = await fetchLatestVideos(10);

    if (videos.length === 0) {
      console.log("[PeerTube] No videos found");
      return;
    }

    const lastNotified = await getLastNotifiedVideo();
    const lastNotifiedDate = lastNotified?.publishedAt || new Date(0);

    const newVideos = videos.filter(
      (video) => new Date(video.publishedAt) > lastNotifiedDate
    );

    if (newVideos.length === 0) {
      console.log("[PeerTube] No new videos since last check");
      return;
    }

    console.log(`[PeerTube] Found ${newVideos.length} new video(s)`);

    // Process oldest first
    for (const video of newVideos.reverse()) {
      await saveVideo({
        uuid: video.uuid,
        name: video.name,
        channelName: video.channel?.displayName || video.channel?.name,
        publishedAt: new Date(video.publishedAt),
      });

      await sendNewVideoNotification({
        videoId: video.uuid,
        videoTitle: video.name,
        channelName: video.channel?.displayName || video.channel?.name,
        backend: PEERTUBE_BACKEND,
      });

      await markVideoNotified(video.uuid);

      console.log(`[PeerTube] Notified about video: ${video.name}`);
    }
  } catch (error) {
    console.error("[PeerTube] Error checking for new videos:", error);
  }
};
