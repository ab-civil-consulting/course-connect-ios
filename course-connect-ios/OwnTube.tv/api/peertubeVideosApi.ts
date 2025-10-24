import { VideosCommonQuery, Video, VideoCaption, VideoView } from "@peertube/peertube-types";
import { GetVideosVideo } from "./models";
import { commonQueryParams } from "./constants";
import { AxiosInstanceBasedApi } from "./axiosInstance";
import { handleAxiosErrorWithRetry } from "./errorHandler";

/**
 * Get videos from the PeerTube backend using `/api/v1/search/videos` API
 * This endpoint works for regular authenticated users (doesn't require admin/moderator)
 *
 * @description https://docs.joinpeertube.org/api-rest-reference.html#tag/Search/operation/searchVideos
 */
export class PeertubeVideosApi extends AxiosInstanceBasedApi {
  constructor(maxChunkSize: number = 100, debugLogging: boolean = false) {
    super();
    this.maxChunkSize = maxChunkSize;
    this.debugLogging = debugLogging;
  }

  debugLogging: boolean = false;

  private _maxChunkSize!: number;
  set maxChunkSize(value: number) {
    if (!(value > 0 && value <= 100)) {
      throw new Error("The maximum number of videos to fetch in a single request is 100");
    }
    this._maxChunkSize = value;
  }
  get maxChunkSize(): number {
    return this._maxChunkSize;
  }

  /**
   * Get total number of "local", "non-live", and "Safe-For-Work" videos from the PeerTube instance
   * Uses the search/videos API which works for regular authenticated users
   *
   * @param [baseURL] - Selected instance url
   * @returns The total number of videos
   */
  async getTotalVideos(baseURL: string): Promise<number> {
    try {
      // IMPORTANT: Only use start and count parameters to avoid 401 errors
      const response = await this.instance.get("search/videos", {
        params: {
          start: 0,
          count: 1,
        },
        baseURL: `https://${baseURL}/api/v1`,
      });
      return response.data.total as number;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "total videos");
    }
  }

  /**
   * Get "local", "non-live", and "Safe-For-Work" videos from the PeerTube instance
   * Uses the search/videos API which works for regular authenticated users
   *
   * @param [baseURL] - Selected instance url
   * @param [queryParams] - Any custom query params
   * @returns A list of videos, with a lot of additional details from the API removed
   */
  async getVideos(
    baseURL: string,
    queryParams?: VideosCommonQuery,
  ): Promise<{ data: GetVideosVideo[]; total: number }> {
    let rawVideos: Required<Video>[] = [];
    let total: number = 0;
    let limit = queryParams?.count || 15;

    if (limit <= this.maxChunkSize) {
      try {
        // IMPORTANT: Only use start and count parameters!
        // Adding filters like privacyOneOf, categoryOneOf, isLocal, search, etc.
        // triggers admin-only mode and causes 401 errors.
        // The authenticated search endpoint automatically returns Public AND Internal videos.
        const params = {
          start: queryParams?.start || commonQueryParams.start,
          count: limit,
        };

        if (this.debugLogging) {
          console.debug("=== Video Fetch Request ===");
          console.debug(`URL: https://${baseURL}/api/v1/search/videos`);
          console.debug("Query Parameters:", params);
          console.debug("Authorization Header:", this.instance.defaults.headers.common['Authorization'] ? 'Present' : 'Not Set');
        }

        // Use search/videos endpoint which works for regular authenticated users
        // This endpoint doesn't require admin/moderator privileges
        const response = await this.instance.get("search/videos", {
          params,
          baseURL: `https://${baseURL}/api/v1`,
        });

        total = response.data.total;
        rawVideos = response.data.data as Required<Video>[];

        if (this.debugLogging) {
          console.debug("=== Video Fetch Response ===");
          console.debug(`Total videos available: ${total}`);
          console.debug(`Videos returned: ${rawVideos.length}`);
          console.debug("Video Privacy Breakdown:", rawVideos.reduce((acc: any, v: any) => {
            const privacy = {1: 'Public', 2: 'Unlisted', 3: 'Private', 4: 'Internal'}[v.privacy?.id] || 'Unknown';
            acc[privacy] = (acc[privacy] || 0) + 1;
            return acc;
          }, {}));
        }
      } catch (error: unknown) {
        return handleAxiosErrorWithRetry(error, "videos");
      }
    } else {
      let rawTotal = -1;
      let offset = 0;
      while (rawVideos.length < limit) {
        let fetchCount = this.maxChunkSize;
        const maxTotalToBeExceeded = rawTotal !== -1 && offset + this.maxChunkSize > rawTotal;
        if (maxTotalToBeExceeded) {
          fetchCount = rawTotal - offset;
          if (this.debugLogging) {
            console.debug(
              `We would exceed the total available ${rawTotal} videos with chunk size ${this.maxChunkSize}, so fetching only ${fetchCount} videos to reach the total`,
            );
          }
        }
        const maxLimitToBeExceeded = rawVideos.length + fetchCount > limit;
        if (maxLimitToBeExceeded) {
          fetchCount = limit - offset;
          if (this.debugLogging) {
            console.debug(
              `We would exceed max limit of ${limit} videos, so fetching only ${fetchCount} additional videos to reach the limit`,
            );
          }
        }
        try {
          // IMPORTANT: Only use start and count parameters!
          const params = {
            start: offset,
            count: fetchCount,
          };

          if (this.debugLogging) {
            console.debug(`=== Video Fetch Request (Chunk ${Math.floor(offset / this.maxChunkSize) + 1}) ===`);
            console.debug(`URL: https://${baseURL}/api/v1/search/videos`);
            console.debug("Query Parameters:", params);
            console.debug("Authorization Header:", this.instance.defaults.headers.common['Authorization'] ? 'Present' : 'Not Set');
          }

          // Use search/videos endpoint which works for regular authenticated users
          // This endpoint doesn't require admin/moderator privileges
          const response = await this.instance.get("search/videos", {
            params,
            baseURL: `https://${baseURL}/api/v1`,
          });
          rawTotal = response.data.total as number;
          if (rawTotal < limit) {
            limit = rawTotal;
          }
          const chunkVideos = response.data.data as Required<Video>[];
          rawVideos = rawVideos.concat(chunkVideos);

          if (this.debugLogging) {
            console.debug(`=== Video Fetch Response (Chunk ${Math.floor(offset / this.maxChunkSize) + 1}) ===`);
            console.debug(`Total videos available: ${rawTotal}`);
            console.debug(`Videos in this chunk: ${chunkVideos.length}`);
            console.debug(`Total videos fetched so far: ${rawVideos.length}`);
          }
        } catch (error: unknown) {
          return handleAxiosErrorWithRetry(error, "videos");
        }
        offset += fetchCount;
      }
    }

    // DEBUG: Log video fetch results
    console.log('[PeertubeVideosApi] Video fetch complete:', {
      totalVideos: rawVideos.length,
      totalFromAPI: total,
      firstVideoName: rawVideos[0]?.name,
      queryParams: queryParams || 'default',
      backend: baseURL,
    });

    if (rawVideos.length > 0) {
      console.log('[PeertubeVideosApi] First video thumbnail data:', {
        uuid: rawVideos[0].uuid,
        name: rawVideos[0].name,
        previewPath: rawVideos[0].previewPath,
        thumbnailPath: rawVideos[0].thumbnailPath,
        hasPreviewPath: !!rawVideos[0].previewPath,
        hasThumbnailPath: !!rawVideos[0].thumbnailPath,
      });
    } else {
      console.warn('[PeertubeVideosApi] No videos returned from API!');
    }

    return {
      data: rawVideos.map((video) => {
        return {
          uuid: video.uuid,
          name: video.name,
          category: video.category,
          description: video.description,
          previewPath: video.previewPath,
          thumbnailPath: video.thumbnailPath,
          duration: video.duration,
          channel: video.channel,
          publishedAt: video.publishedAt,
          originallyPublishedAt: video.originallyPublishedAt,
          views: video.views,
          isLive: video.isLive,
          viewers: video.viewers,
          state: video.state,
        };
      }),
      total,
    };
  }

  /**
   * Get data for a specified video
   *
   * @param [baseURL] - Selected instance url
   * @param [id] - Video uuid
   * @returns Video data
   */
  async getVideo(baseURL: string, id: string) {
    try {
      const response = await this.instance.get<Video>(`videos/${id}`, {
        baseURL: `https://${baseURL}/api/v1`,
      });

      return response.data;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "video data");
    }
  }
  /**
   * Post a view for a specified video
   *
   * @param [baseURL] - Selected instance url
   * @param [id] - Video uuid
   * @param [viewData] - Object containing view data (currentTime, viewEvent, sessionId)
   * @returns void
   */
  async postVideoView(baseURL: string, id: string, viewData: VideoView = { currentTime: 0 }): Promise<void> {
    try {
      await this.instance.post(`videos/${id}/views`, viewData, {
        baseURL: `https://${baseURL}/api/v1`,
      });
    } catch (error: unknown) {
      handleAxiosErrorWithRetry(error, "post video view");
    }
  }

  /**
   * Request video file token for accessing private videos
   *
   * @param [baseURL] - Selected instance url
   * @param [id] - Video uuid
   * @returns Video file token object with files and streamingPlaylists tokens
   */
  async requestVideoToken(baseURL: string, id: string) {
    try {
      const response = await this.instance.post<{ files: { token: string }; streamingPlaylists: { token: string } }>(
        `videos/${id}/token`,
        {},
        {
          baseURL: `https://${baseURL}/api/v1`,
        },
      );

      return response.data;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "video token");
    }
  }

  /**
   * Get captions for a specified video
   *
   * @param [baseURL] - Selected instance url
   * @param [id] - Video uuid
   * @returns Video captions
   */
  async getVideoCaptions(baseURL: string, id: string) {
    try {
      const response = await this.instance.get<{ data: VideoCaption[] }>(`videos/${id}/captions`, {
        baseURL: `https://${baseURL}/api/v1`,
      });

      return response.data.data;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "video captions");
    }
  }
}

export const ApiServiceImpl = new PeertubeVideosApi();
