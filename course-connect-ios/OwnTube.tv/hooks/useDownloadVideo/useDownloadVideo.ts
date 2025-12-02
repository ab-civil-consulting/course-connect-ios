import { useGlobalSearchParams } from "expo-router";
import { useState, useMemo, useEffect } from "react";
import { useGetVideoQuery, ApiServiceImpl } from "../../api";
import { RootStackParams } from "../../app/_layout";
import { useFullScreenModalContext } from "../../contexts";
import { ROUTES } from "../../types";
import { formatFileSize } from "../../utils";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import Toast from "react-native-toast-message";
import { useAuthSessionStore } from "../../store";

const useDownloadVideo = () => {
  if (__DEV__) {
    console.log("🔵 [MOBILE/NATIVE] useDownloadVideo hook loaded - using expo-file-system");
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
        console.log("🔵 [MOBILE/NATIVE] Generated picker options from direct files:", options);
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
        console.log("⚠️ [MOBILE/NATIVE] WARNING: Using streaming playlist files (may not download correctly):", options);
      }
      return options;
    }

    if (__DEV__) {
      console.log("🔵 [MOBILE/NATIVE] No picker options available");
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
    if (pickerOptions && pickerOptions.length > 1) {
      const lowestQualityOption = pickerOptions.at(pickerOptions.at(-1)?.label.startsWith("Audio only") ? -2 : -1);

      if (lowestQualityOption) {
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
      console.log("🔵 [MOBILE/NATIVE] handleDownloadFile called with selectedFile:", selectedFile);
      console.log("🔵 [MOBILE/NATIVE] Available pickerOptions:", pickerOptions);
    }

    // If no file is selected, try to use the first available option as fallback
    let fileToDownload = selectedFile;

    if (!fileToDownload && pickerOptions.length > 0) {
      if (__DEV__) {
        console.log("🔵 [MOBILE/NATIVE] No file was selected, using first available option as fallback");
      }
      fileToDownload = pickerOptions[0].value;
      setSelectedFile(fileToDownload);
    }

    if (!fileToDownload) {
      if (__DEV__) {
        console.log("🔵 [MOBILE/NATIVE] No file to download and no fallback available, returning early");
      }
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

    toggleModal(false);

    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Storage permission is required to save videos to your device. Please enable it in your device settings.",
          [{ text: "OK" }]
        );
        return;
      }

      // Show downloading toast
      Toast.show({
        type: "info",
        text1: "Downloading video...",
        text2: "Please wait while the video is being downloaded.",
      });

      // Get authenticated download URL (with videoFileToken query param as fallback)
      const authenticatedUrl = getAuthenticatedDownloadUrl(fileToDownload);

      // Get filename from URL or generate one
      const filename = fileToDownload.split("/").pop() || `video_${Date.now()}.mp4`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Build download options with Authorization header
      const { session } = useAuthSessionStore.getState();
      const downloadOptions: FileSystem.DownloadOptions = {};

      if (session?.accessToken) {
        downloadOptions.headers = {
          Authorization: `${session.tokenType || 'Bearer'} ${session.accessToken}`,
        };
        if (__DEV__) {
          console.log("🔵 [MOBILE/NATIVE] Using Bearer token authentication for download");
        }
      } else {
        if (__DEV__) {
          console.log("🔵 [MOBILE/NATIVE] No session found, relying on query parameter authentication only");
        }
      }

      // Download the file with authenticated URL and headers
      const downloadResult = await FileSystem.downloadAsync(authenticatedUrl, fileUri, downloadOptions);

      if (!downloadResult.uri) {
        throw new Error("Download failed - no file URI returned");
      }

      // Save to media library (Photos/Gallery)
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);

      // Try to add to album, but don't fail if album creation fails
      try {
        const album = await MediaLibrary.getAlbumAsync("Course Connect");
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync("Course Connect", asset, false);
        }
      } catch (albumError) {
        // Album creation/addition failed, but the asset is already saved to the library
        if (__DEV__) {
          console.log("Could not add to Course Connect album, but video is saved:", albumError);
        }
      }

      // Clean up temporary file
      await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });

      // Show success toast
      Toast.show({
        type: "success",
        text1: "Download complete",
        text2: "Video saved to your photo library.",
      });
    } catch (error) {
      console.error("Download error:", error);

      Toast.show({
        type: "error",
        text1: "Download failed",
        text2: error instanceof Error ? error.message : "An error occurred while downloading the video.",
      });
    }
  };

  const handleFileSelection = (value: string | undefined) => {
    if (__DEV__) {
      console.log("🔵 [MOBILE/NATIVE] File selected via picker:", value);
    }
    setSelectedFile(value);
  };

  return { handleDownloadFile, selectedFile, setSelectedFile: handleFileSelection, pickerOptions };
};

export default useDownloadVideo;
