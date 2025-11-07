import { AxiosInstanceBasedApi } from "./axiosInstance";
import { handleAxiosErrorWithRetry } from "./errorHandler";
import { User } from "@peertube/peertube-types";

/**
 * PeerTube Users API
 *
 * @description https://docs.joinpeertube.org/api-rest-reference.html#tag/Users
 */
export class UsersApi extends AxiosInstanceBasedApi {
  constructor() {
    super();
  }

  /**
   * Get *my* user info
   *
   */
  async getMyUserInfo(baseURL: string): Promise<User> {
    if (!baseURL || baseURL === 'undefined') {
      throw new Error('[UsersApi] Backend URL is required but was not provided or is undefined');
    }

    try {
      const response = await this.instance.get("users/me", {
        baseURL: `https://${baseURL}/api/v1`,
      });

      return response.data;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "my user info");
    }
  }

  /**
   * Get *my* subscription data on the specified channel
   */
  async getSubscriptionByChannel(baseURL: string, channelHandle: string): Promise<Record<string, boolean>> {
    try {
      const response = await this.instance.get("users/me/subscriptions/exist", {
        baseURL: `https://${baseURL}/api/v1`,
        params: { uris: channelHandle },
      });

      return response.data;
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "my channel subscription");
    }
  }

  /**
   * Update *my* user information (email, password, etc.)
   *
   * @param baseURL - PeerTube instance URL
   * @param data - Update data (email, password, currentPassword required)
   * @returns Promise that resolves when update is successful (204 No Content)
   */
  async updateMyUserInfo(
    baseURL: string,
    data: {
      email?: string;
      password?: string;
      currentPassword: string;
    }
  ): Promise<void> {
    if (!baseURL || baseURL === 'undefined') {
      throw new Error('[UsersApi] Backend URL is required but was not provided or is undefined');
    }

    try {
      await this.instance.put("users/me", data, {
        baseURL: `https://${baseURL}/api/v1`,
      });
    } catch (error: unknown) {
      return handleAxiosErrorWithRetry(error, "update user info");
    }
  }
}

export const UsersApiImpl = new UsersApi();
