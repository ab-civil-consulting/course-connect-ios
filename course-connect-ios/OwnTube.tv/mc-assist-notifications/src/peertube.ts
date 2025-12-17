import axios from "axios";
import { saveVideo, markVideoNotified, hasBeenNotified } from "./database";
import { sendNewVideoNotification } from "./expo-push";

const PEERTUBE_BACKEND = process.env.PEERTUBE_BACKEND || "course-connect.ab-civil.com";
const PEERTUBE_API_URL = `https://${PEERTUBE_BACKEND}/api/v1`;
const PEERTUBE_CLIENT_ID = process.env.PEERTUBE_CLIENT_ID;
const PEERTUBE_CLIENT_SECRET = process.env.PEERTUBE_CLIENT_SECRET;
const PEERTUBE_USERNAME = process.env.PEERTUBE_USERNAME;
const PEERTUBE_PASSWORD = process.env.PEERTUBE_PASSWORD;

interface PeerTubeVideo {
  uuid: string;
  name: string;
  publishedAt: string;
  privacy: {
    id: number;
    label: string;
  };
  state: {
    id: number;
    label: string;
  };
  channel?: {
    name: string;
    displayName: string;
  };
}

interface PeerTubeResponse {
  total: number;
  data: PeerTubeVideo[];
}

interface PeerTubeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

let accessToken: string | null = null;
let tokenExpiry: Date | null = null;

const getAccessToken = async (): Promise<string> => {
  // Return cached token if still valid
  if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
    return accessToken;
  }

  if (!PEERTUBE_CLIENT_ID || !PEERTUBE_CLIENT_SECRET || !PEERTUBE_USERNAME || !PEERTUBE_PASSWORD) {
    throw new Error("PeerTube OAuth credentials not configured");
  }

  try {
    const response = await axios.post<PeerTubeTokenResponse>(
      `${PEERTUBE_API_URL}/users/token`,
      new URLSearchParams({
        client_id: PEERTUBE_CLIENT_ID,
        client_secret: PEERTUBE_CLIENT_SECRET,
        grant_type: "password",
        username: PEERTUBE_USERNAME,
        password: PEERTUBE_PASSWORD,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000 - 60000); // Refresh 1 min early

    console.log("[PeerTube] Successfully obtained access token");
    return accessToken;
  } catch (error) {
    console.error("[PeerTube] Failed to get access token:", error);
    throw error;
  }
};

export const fetchLatestVideos = async (count = 50): Promise<PeerTubeVideo[]> => {
  try {
    const token = await getAccessToken();

    const response = await axios.get<PeerTubeResponse>(`${PEERTUBE_API_URL}/videos`, {
      params: {
        start: 0,
        count,
        sort: "-publishedAt",
      },
      headers: {
        Authorization: `Bearer ${token}`,
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
    const videos = await fetchLatestVideos();

    if (videos.length === 0) {
      console.log("[PeerTube] No videos found");
      return;
    }

    let notifiedCount = 0;

    for (const video of videos) {
      // Skip private videos (privacy.id === 3)
      if (video.privacy.id === 3) {
        continue;
      }

      // Skip videos that aren't published/transcoded yet (state.id !== 1)
      if (video.state.id !== 1) {
        continue;
      }

      // Check if already notified
      const alreadyNotified = await hasBeenNotified(video.uuid);
      if (alreadyNotified) {
        continue;
      }

      // Save and notify about this video
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
      notifiedCount++;

      console.log(`[PeerTube] Notified about video: ${video.name}`);
    }

    if (notifiedCount === 0) {
      console.log("[PeerTube] No new public/internal videos to notify about");
    } else {
      console.log(`[PeerTube] Sent ${notifiedCount} notification(s)`);
    }
  } catch (error) {
    console.error("[PeerTube] Error checking for new videos:", error);
  }
};
