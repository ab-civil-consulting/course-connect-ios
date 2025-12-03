# PeerTube Server Configuration for Mobile App

## Overview

This mobile app requires specific PeerTube server configurations for optimal video playback, especially on Android and iOS devices.

## Issue: Videos Not Playing on Android

If videos get stuck loading or show 404 errors on Android, the issue is typically that your PeerTube server only has HLS transcoding configured, but the transcoding hasn't completed or is broken.

### Symptoms
- Videos load in browser but not in mobile app
- 404 errors in Android logcat mentioning HLS playlists
- `data.files` array is empty (length: 0)
- Only `streamingPlaylists` are available

### Diagnosis Logs
Check for these logs in the app:
```
[VideoScreen] data.files?.length: 0
[VideoScreen] streamingPlaylists length: 1
[VideoScreen] ⚠️  Video has NO direct files, only HLS playlist
```

## Required PeerTube Configuration

### Option 1: Enable Web Videos (Recommended for Mobile)

**Web Videos** (previously called WebTorrent) provides direct MP4 file URLs that work reliably on mobile devices.

**Steps:**
1. Log into your PeerTube instance as an administrator
2. Go to **Administration → Settings → Transcoding**
3. Enable **"Web Videos"** transcoding
4. Set desired resolutions (e.g., 480p, 720p, 1080p)
5. Save changes
6. For existing videos: Re-transcode them or upload new videos

**Why Web Videos are better for mobile:**
- ✅ Always available (original upload + transcoded versions)
- ✅ Direct file URLs work on all platforms
- ✅ No dependency on HLS segment availability
- ✅ Better authentication support (query parameters)
- ✅ Simpler playback (no manifest parsing needed)

### Option 2: Fix HLS Transcoding

If you prefer HLS-only, ensure HLS transcoding is working properly.

**Steps:**
1. Check PeerTube transcoding job queue
2. Verify ffmpeg is installed: `ffmpeg -version`
3. Check PeerTube logs for transcoding errors:
   ```bash
   journalctl -u peertube -f
   ```
4. Ensure storage has enough space
5. Verify HLS files exist at: `/var/www/peertube/storage/streaming-playlists/hls/{video-uuid}/`

**Note:** HLS-only works on web but may have issues on Android/iOS:
- Android's ExoPlayer can fail if HLS segments are missing
- iOS requires proper content-type headers
- Authentication is more complex (tokens need to be passed to all segments)

## Recommended Settings

For best mobile compatibility, enable **both** Web Videos and HLS:

```yaml
transcoding:
  enabled: true

  # Enable Web Videos for mobile devices
  web_videos:
    enabled: true

  # Optional: Enable HLS for adaptive streaming
  hls:
    enabled: true

  # Recommended resolutions
  resolutions:
    240p: false
    360p: true
    480p: true
    720p: true
    1080p: true
    1440p: false
    2160p: false
```

## Verifying Configuration

### Check via PeerTube UI
1. Open any video in your PeerTube instance
2. Right-click the video player → **Inspect** (Chrome DevTools)
3. Go to **Network** tab
4. Reload the page
5. Look for requests to:
   - `/static/web-videos/` (Web Videos) ✅
   - `/static/streaming-playlists/hls/` (HLS)

### Check via API
```bash
curl https://your-instance.com/api/v1/videos/{video-id} | jq '.files'
```

**Expected response with Web Videos enabled:**
```json
{
  "files": [
    {
      "resolution": { "id": 720 },
      "fileUrl": "https://your-instance.com/static/web-videos/...",
      "size": 12345678
    }
  ]
}
```

**Problem response (Web Videos disabled):**
```json
{
  "files": []
}
```

## Common Error Codes

### Error 22004
**Symptom:** Video player shows error code 22004
**Meaning:** ExoPlayer cannot load the video source (format error or file not found)
**Cause:** The HLS playlist exists in PeerTube's database but the actual video files are missing (404)

**Solutions:**
1. **Enable Web Videos** (Recommended):
   - Go to PeerTube admin → Settings → Transcoding
   - Enable "Web Videos"
   - Re-transcode existing videos

2. **Fix HLS transcoding:**
   - Check if HLS transcoding jobs completed successfully
   - Verify video files exist: `/var/www/peertube/storage/streaming-playlists/hls/{video-uuid}/`
   - Check PeerTube logs for transcoding errors

3. **Re-upload the video:**
   - Delete and re-upload the problematic video
   - Ensure transcoding completes before sharing

### Error 2004
**Meaning:** Failed to load video source
**Cause:** Network issue or invalid URL
**Solution:** Check network connection and verify video URL is accessible

### Error 2002
**Meaning:** Network error
**Cause:** Connection timeout or DNS failure
**Solution:** Check internet connection and firewall settings

## Troubleshooting

### Videos still not playing after enabling Web Videos

1. **Re-transcode existing videos:**
   - Go to **Administration → Videos**
   - Select videos
   - Choose **"Re-transcode"**
   - Wait for jobs to complete

2. **Check transcoding job status:**
   ```bash
   # If using Redis
   redis-cli
   > LLEN bull:video-transcoding:wait
   ```

3. **Check storage permissions:**
   ```bash
   ls -la /var/www/peertube/storage/web-videos/
   chown -R peertube:peertube /var/www/peertube/storage/
   ```

### 404 errors persist

If you still see 404 errors after enabling Web Videos:
1. Verify nginx/apache is serving static files correctly
2. Check firewall rules aren't blocking `/static/` URLs
3. Verify the video files physically exist on disk
4. Check PeerTube's `storage` configuration in `config/production.yaml`

## Mobile App Behavior

### Android
- **Prefers:** Web Videos (direct MP4 files)
- **Fallback:** HLS (if Web Videos unavailable)
- **Why:** ExoPlayer handles direct files more reliably than HLS

### iOS
- **Prefers:** HLS (adaptive streaming)
- **Fallback:** Web Videos
- **Why:** Native player has excellent HLS support

### Web
- **Uses:** HLS (via Video.js)
- **Fallback:** Web Videos
- **Why:** Better quality adaptation and bandwidth management

## Additional Resources

- [PeerTube Transcoding Documentation](https://docs.joinpeertube.org/admin/configuration#transcoding)
- [PeerTube API Documentation](https://docs.joinpeertube.org/api-rest-reference.html)
- [Video.js Documentation](https://videojs.com/)
- [ExoPlayer (Android) Documentation](https://exoplayer.dev/)

## Support

If you continue experiencing issues after following this guide:
1. Check PeerTube server logs
2. Verify app logs show proper video data structure
3. Test video URLs directly in browser
4. Contact your PeerTube administrator or hosting provider
