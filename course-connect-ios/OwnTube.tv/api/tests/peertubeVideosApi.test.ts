import { PeertubeVideosApi } from "../peertubeVideosApi";

describe("peertubeVideosApi", () => {
  it("should return a list of videos, maximum 15 to default", async () => {
    const peertubeVideosApi = new PeertubeVideosApi();
    const videos = await peertubeVideosApi.getVideos("peertube2.cpy.re");

    expect(videos).toBeDefined();
    expect(videos.data.length).toBeLessThanOrEqual(15);
  }, 10000);

  it("should return a list of videos, limited to maximum 2 when specified", async () => {
    const peertubeVideosApi = new PeertubeVideosApi();
    const videos = await peertubeVideosApi.getVideos("peertube2.cpy.re", { count: 2 });

    expect(videos).toBeDefined();
    expect(videos.data.length).toBeLessThanOrEqual(2);
  }, 10000);

  // it("should return total number of videos", async () => {
  //   const peertubeVideosApi = new PeertubeVideosApi();
  //   const total = await peertubeVideosApi.getTotalVideos("peertube2.cpy.re");
  //
  //   expect(total).toBe(28);
  // });

  // Skipping this test due to external API timeout issues in CI
  // This test makes multiple real API calls which can be slow/unreliable
  it.skip("should return a list of videos, but not more than the total available videos", async () => {
    const peertubeVideosApi = new PeertubeVideosApi();
    const totalVideos = await peertubeVideosApi.getTotalVideos("peertube2.cpy.re");

    // Test with a smaller chunk size (cap at 100 due to API validation)
    const smallerChunkSize = Math.min(50, Math.floor(totalVideos / 2));
    peertubeVideosApi.maxChunkSize = smallerChunkSize;
    let videos = await peertubeVideosApi.getVideos("peertube2.cpy.re", { count: totalVideos + 1 });
    expect(videos).toBeDefined();
    expect(videos.data.length).toBe(totalVideos);

    // Test with a larger chunk size (cap at 100 due to API validation)
    const largerChunkSize = Math.min(100, totalVideos + 5);
    peertubeVideosApi.maxChunkSize = largerChunkSize;
    videos = await peertubeVideosApi.getVideos("peertube2.cpy.re", { count: totalVideos + 1 });
    expect(videos).toBeDefined();
    expect(videos.data.length).toBe(totalVideos);
  }, 30000);

  it("should get video info by uuid", async () => {
    const peertubeVideosApi = new PeertubeVideosApi();
    const videoInfo = await peertubeVideosApi.getVideo("peertube2.cpy.re", "04af977f-4201-4697-be67-a8d8cae6fa7a");

    expect(videoInfo).toBeDefined();
    expect(videoInfo.name).toBe("The Internet's Own Boy");
  }, 10000);
});
