import { AxiosError } from "axios";
import { ApiError } from "./models";
import { postHogInstance } from "../diagnostics";
import { CustomPostHogExceptions } from "../diagnostics/constants";

export function handleAxiosErrorWithRetry(error: unknown, target: string): Promise<never> {
  const { message, response, config, request } = error as AxiosError;
  const retryAfter = response?.headers["retry-after"];

  // DEBUG: Log detailed error information
  console.error(`[handleAxiosError] Failed to fetch ${target}:`, {
    message,
    status: response?.status,
    statusText: response?.statusText,
    url: config?.url,
    baseURL: config?.baseURL,
    method: config?.method,
    params: config?.params,
    responseData: response?.data,
    retryAfter,
    headers: response?.headers,
    requestHeaders: config?.headers,
    hasRequest: !!request,
    hasResponse: !!response
  });

  // Log the full error response data as JSON for debugging
  if (response?.data) {
    console.error(`[handleAxiosError] Full Response Data:`, JSON.stringify(response.data, null, 2));
  }

  if (retryAfter) {
    if (__DEV__) {
      console.info(`Too many requests. Retrying to fetch ${target} in ${retryAfter} seconds...`);
    }
    postHogInstance.captureException(error, { errorType: `${CustomPostHogExceptions.RateLimitError} (${target})` });
  } else {
    postHogInstance.captureException(error, { errorType: `${CustomPostHogExceptions.HttpRequestError} (${target})` });
  }

  return new Promise((_, reject) => {
    setTimeout(
      () => {
        reject(
          new ApiError({
            text: `Failed to fetch ${target}. ${message}`,
            status: response?.status,
            code: (response?.data as { code: string })?.code,
            message,
          }),
        );
      },
      (retryAfter ?? 0) * 1000, // QueryClient will handle the retry
    );
  });
}
