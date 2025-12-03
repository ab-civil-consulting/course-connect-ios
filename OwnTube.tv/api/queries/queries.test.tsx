import { renderHook, waitFor } from "@testing-library/react-native";
import { ApiServiceImpl } from "../peertubeVideosApi";
import { useLocalSearchParams } from "expo-router";
import { createQueryClientWrapper } from "../../utils/testing";
import { useGetVideoQuery } from "./videos";

const wrapper = createQueryClientWrapper();

jest.mock("../peertubeVideosApi", () => ({
  ApiServiceImpl: {
    getVideos: jest.fn(() => ({
      data: [
        { uuid: "123", previewPath: "/123f-3fe-3" },
        { uuid: "1235", previewPath: "/123f-3fe-3yt3" },
      ],
      total: 50,
    })),
    getVideo: jest.fn(() => ({
      uuid: "123",
      description: "desc",
    })),
  },
}));
jest.mock("expo-router");

describe("useGetVideoQuery", () => {
  it("should fetch live data", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ backend: "abc.xyz" });
    const { result } = renderHook(() => useGetVideoQuery({ id: "123" }), { wrapper });
    await waitFor(() => expect(ApiServiceImpl.getVideo).toHaveBeenCalledWith("abc.xyz", "123"));
    await waitFor(() => expect(result.current.data).toStrictEqual({ description: "desc", uuid: "123" }));
  });
});
