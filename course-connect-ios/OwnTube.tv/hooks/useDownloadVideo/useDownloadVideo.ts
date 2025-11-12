import { useGlobalSearchParams } from "expo-router";
import { useState, useMemo, useEffect } from "react";
import { useGetVideoQuery, ApiServiceImpl } from "../../api";
import { RootStackParams } from "../../app/_layout";
import { useFullScreenModalContext } from "../../contexts";
import { ROUTES } from "../../types";
import { formatFileSize } from "../../utils";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import Toast from "react-native-toast-message";

const useDownloadVideo = () => {
  const { toggleModal } = useFullScreenModalContext();
  const params = useGlobalSearchParams<RootStackParams[ROUTES.VIDEO]>();
  const [selectedFile, setSelectedFile] = useState<string>();
  const [videoFileToken, setVideoFileToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  const { data: videoData } = useGetVideoQuery({ id: params?.id });

  const pickerOptions = useMemo(() => {
    if (videoData?.streamingPlaylists && Number(videoData?.streamingPlaylists?.length) > 0) {
      return videoData.streamingPlaylists[0].files.map((file) => ({
        label: `${file.resolution.label} (${formatFileSize(file.size)})`,
        value: file.fileDownloadUrl,
      }));
    }

    if (videoData?.files && Number(videoData?.files?.length) > 0) {
      return videoData.files.map((file) => ({
        label: `${file.resolution.label} (${formatFileSize(file.size)})`,
        value: file.fileDownloadUrl,
      }));
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
      console.log("Video requires authentication, fetching token...");
      setIsLoadingToken(true);
      ApiServiceImpl.requestVideoToken(params.backend, params.id)
        .then((tokenData) => {
          if (tokenData?.files?.token) {
            console.log("Video token received successfully");
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
      console.log("Video is public, no authentication needed");
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
      console.log("Using authenticated download URL");
      return authenticatedUrl;
    }
    return url;
  };

  const handleDownloadFile = async () => {
    if (!selectedFile) {
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

      // Get authenticated download URL
      const authenticatedUrl = getAuthenticatedDownloadUrl(selectedFile);

      // Get filename from URL or generate one
      const filename = selectedFile.split("/").pop() || `video_${Date.now()}.mp4`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Download the file with authenticated URL
      const downloadResult = await FileSystem.downloadAsync(authenticatedUrl, fileUri);

      if (!downloadResult.uri) {
        throw new Error("Download failed - no file URI returned");
      }

      // Save to media library (Photos/Gallery)
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      await MediaLibrary.createAlbumAsync("MC Assist", asset, false);

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

  return { handleDownloadFile, selectedFile, setSelectedFile, pickerOptions };
};

export default useDownloadVideo;
