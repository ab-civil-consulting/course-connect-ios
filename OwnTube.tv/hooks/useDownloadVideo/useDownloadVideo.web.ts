import { useGlobalSearchParams } from "expo-router";
import { useState, useMemo, useEffect } from "react";
import { useGetVideoQuery, ApiServiceImpl } from "../../api";
import { RootStackParams } from "../../app/_layout";
import { ROUTES } from "../../types";
import { formatFileSize } from "../../utils";
import Toast from "react-native-toast-message";
import { useFullScreenModalContext } from "../../contexts";

const useDownloadVideo = () => {
  if (__DEV__) {
    console.log("🌐 [WEB] useDownloadVideo hook loaded - using document.createElement");
  }
  const { toggleModal } = useFullScreenModalContext();
  const params = useGlobalSearchParams<RootStackParams[ROUTES.VIDEO]>();
  const [selectedFile, setSelectedFile] = useState<string>();
  const [videoFileToken, setVideoFileToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  const { data: videoData } = useGetVideoQuery({ id: params?.id });

  const pickerOptions = useMemo(() => {
    // IMPORTANT: Prioritize direct files over streaming playlists for downloads
    // Direct files (videoData.files) are complete MP4s suitable for download
    // Streaming playlists (streamingPlaylists) contain HLS fragments unsuitable for download
    if (videoData?.files && Number(videoData?.files?.length) > 0) {
      const options = videoData.files.map((file) => ({
        label: `${file.resolution.label} (${formatFileSize(file.size)})`,
        value: file.fileDownloadUrl,
      }));
      if (__DEV__) {
        console.log("🌐 [WEB] Picker options (direct files):", options);
      }
      return options;
    }

    // Fallback to streaming playlists only if no direct files available
    // Note: This may not work well as these are HLS segments, not complete videos
    if (videoData?.streamingPlaylists && Number(videoData?.streamingPlaylists?.length) > 0) {
      const options = videoData.streamingPlaylists[0].files.map((file) => ({
        label: `${file.resolution.label} (${formatFileSize(file.size)})`,
        value: file.fileDownloadUrl,
      }));
      if (__DEV__) {
        console.warn("⚠️ [WEB] WARNING: Using streaming playlist files (may not download correctly):", options);
      }
      return options;
    }

    if (__DEV__) {
      console.log("🌐 [WEB] No picker options available");
    }
    return [];
  }, [videoData]);

  // Check if video requires authentication (Internal or Private)
  const needsAuthentication = useMemo(() => {
    return videoData?.privacy?.id && videoData.privacy.id >= 3;
  }, [videoData]);

  // Fetch video token if authentication is needed
  useEffect(() => {
    if (!videoData || !params?.backend || !params?.id) return;

    if (needsAuthentication) {
      if (__DEV__) {
        console.log("Video requires authentication, fetching token...");
      }
      setIsLoadingToken(true);
      ApiServiceImpl.requestVideoToken(params.backend, params.id)
        .then((tokenData) => {
          if (tokenData?.files?.token) {
            if (__DEV__) {
              console.log("Video token received successfully");
            }
            setVideoFileToken(tokenData.files.token);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch video token:", error);
        })
        .finally(() => {
          setIsLoadingToken(false);
        });
    } else {
      if (__DEV__) {
        console.log("Video is public, no authentication needed");
      }
    }
  }, [videoData, params?.backend, params?.id, needsAuthentication]);

  useEffect(() => {
    if (__DEV__) {
      console.log("useEffect triggered, pickerOptions length:", pickerOptions.length);
    }

    if (pickerOptions && pickerOptions.length > 0) {
      // If only one option, use it
      if (pickerOptions.length === 1) {
        if (__DEV__) {
          console.log("Only one option available, selecting:", pickerOptions[0]);
        }
        setSelectedFile(pickerOptions[0].value);
        return;
      }

      // Multiple options - select lowest quality (but not audio-only)
      const lowestQualityOption = pickerOptions.at(pickerOptions.at(-1)?.label.startsWith("Audio only") ? -2 : -1);

      if (lowestQualityOption) {
        if (__DEV__) {
          console.log("Selected lowest quality option:", lowestQualityOption);
        }
        setSelectedFile(lowestQualityOption.value);
      }
    }
  }, [pickerOptions]);

  // Helper function to add authentication token to download URL
  const getAuthenticatedDownloadUrl = (url: string) => {
    if (needsAuthentication && videoFileToken) {
      const separator = url.includes("?") ? "&" : "?";
      const authenticatedUrl = `${url}${separator}videoFileToken=${videoFileToken}`;
      if (__DEV__) {
        console.log("Using authenticated download URL");
      }
      return authenticatedUrl;
    }
    return url;
  };

  const handleDownloadFile = async () => {
    if (__DEV__) {
      console.log("🌐 [WEB] Download button clicked!");
      console.log("🌐 [WEB] Current selectedFile:", selectedFile);
      console.log("🌐 [WEB] Available pickerOptions:", pickerOptions);
    }

    // If no file is selected, try to use the first available option as fallback
    let fileToDownload = selectedFile;

    if (!fileToDownload && pickerOptions.length > 0) {
      if (__DEV__) {
        console.warn("No file was selected, using first available option as fallback");
      }
      fileToDownload = pickerOptions[0].value;
      setSelectedFile(fileToDownload);
    }

    if (!fileToDownload) {
      console.error("No file selected for download and no fallback available");
      Toast.show({
        type: "error",
        text1: "Download failed",
        text2: "No video quality selected. Please select a quality and try again.",
      });
      return;
    }

    // Check if we're still loading the authentication token
    if (needsAuthentication && isLoadingToken) {
      Toast.show({
        type: "info",
        text1: "Preparing download...",
        text2: "Authenticating access to video file.",
      });
      return;
    }

    // Check if authentication is required but token is missing
    if (needsAuthentication && !videoFileToken) {
      Toast.show({
        type: "error",
        text1: "Authentication required",
        text2: "Unable to authenticate download. Please try again.",
      });
      return;
    }

    if (__DEV__) {
      console.log("Starting download for:", fileToDownload);
    }

    // Close the modal first
    toggleModal(false);

    try {
      // Show downloading toast
      Toast.show({
        type: "info",
        text1: "Downloading video...",
        text2: "Your browser will prompt you to save the file.",
      });

      // Get authenticated download URL
      const authenticatedUrl = getAuthenticatedDownloadUrl(fileToDownload);

      const link = document.createElement("a");
      link.href = authenticatedUrl;
      link.download = fileToDownload.split("/").pop()?.split("?")[0] || "video.mp4";
      document.body.appendChild(link);

      if (__DEV__) {
        console.log("Triggering download link click");
      }
      link.click();

      document.body.removeChild(link);
      if (__DEV__) {
        console.log("Download initiated successfully");
      }

      // Show success toast after a brief delay
      setTimeout(() => {
        Toast.show({
          type: "success",
          text1: "Download started",
          text2: "Check your browser's download folder.",
        });
      }, 500);
    } catch (error) {
      console.error("Download error:", error);

      Toast.show({
        type: "error",
        text1: "Download failed",
        text2: error instanceof Error ? error.message : "An error occurred while downloading the video.",
      });
    }
  };

  return { handleDownloadFile, selectedFile, setSelectedFile, pickerOptions };
};

export default useDownloadVideo;
