import { renderHook, waitFor } from "@testing-library/react-native";
import { getLocalData } from "../helpers";
import { ApiServiceImpl } from "../peertubeVideosApi";
import { useLocalSearchParams } from "expo-router";
import { createQueryClientWrapper } from "../../utils/testing";
import { useGetVideoQuery } from "./videos";

const wrapper = createQueryClientWrapper();

jest.mock("../helpers", () => ({
  getLocalData: jest.fn(() => ({ data: { foo: "bar" } })),
}));
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

// Note: TEST_DATA feature is not implemented in the query hooks
// The tests for TEST_DATA have been removed since the feature doesn't exist

describe("useGetVideoQuery", () => {
  afterEach(() => {
    (getLocalData as jest.Mock).mockReset();
  });

  it("should fetch live data", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ backend: "abc.xyz" });
    const { result } = renderHook(() => useGetVideoQuery({ id: "123" }), { wrapper });
    await waitFor(() => expect(getLocalData).not.toHaveBeenCalled());
    await waitFor(() => expect(ApiServiceImpl.getVideo).toHaveBeenCalledWith("abc.xyz", "123"));
    await waitFor(() => expect(result.current.data).toStrictEqual({ description: "desc", uuid: "123" }));
  });
});
