/**
 * Script to batch update all Unlisted videos to Internal privacy level
 *
 * Usage: node scripts/updateVideoPrivacy.js
 *
 * You'll need to provide:
 * - PeerTube instance URL
 * - Username
 * - Password
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n=== PeerTube Video Privacy Batch Updater ===\n');

  // Get credentials
  let instance = await question('PeerTube instance (e.g., course-connect.ab-civil.com): ');
  const username = await question('Username: ');
  const password = await question('Password: ');

  // Clean up instance URL
  instance = instance.trim()
    .replace(/^https?:\/\//, '')  // Remove http:// or https://
    .replace(/\/$/, '');           // Remove trailing slash

  const baseURL = `https://${instance}/api/v1`;

  console.log(`\n🔗 Connecting to: ${baseURL}`);
  console.log('🔐 Authenticating...');

  try {
    // Step 1: Get OAuth client credentials
    const { data: oauthClient } = await axios.get(`${baseURL}/oauth-clients/local`);

    // Step 2: Login
    const { data: authData } = await axios.post(
      `${baseURL}/users/token`,
      {
        client_id: oauthClient.client_id,
        client_secret: oauthClient.client_secret,
        grant_type: 'password',
        username,
        password,
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const token = authData.access_token;
    console.log('✅ Authentication successful!\n');

    // Step 3: Get all videos
    console.log('📹 Fetching all videos...');
    const { data: videosResponse } = await axios.get(`${baseURL}/users/me/videos`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { count: 100, start: 0 }
    });

    const videos = videosResponse.data;
    console.log(`Found ${videos.length} videos\n`);

    if (videos.length === 0) {
      console.log('No videos found. Exiting.');
      rl.close();
      return;
    }

    // Show current privacy levels
    const privacyLevels = {
      1: 'Public',
      2: 'Unlisted',
      3: 'Private',
      4: 'Internal'
    };

    console.log('Current video privacy levels:');
    videos.forEach(video => {
      const privacyLabel = privacyLevels[video.privacy.id] || `Unknown (${video.privacy.id})`;
      console.log(`  - ${video.name}: ${privacyLabel}`);
    });

    // Filter videos that need updating (only Unlisted videos)
    const videosToUpdate = videos.filter(v => v.privacy.id === 2);

    if (videosToUpdate.length === 0) {
      console.log('\n✅ No Unlisted videos found! Nothing to update.');
      rl.close();
      return;
    }

    console.log(`\n⚠️  ${videosToUpdate.length} video(s) will be updated from Unlisted to Internal.`);
    const confirm = await question('Continue? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled.');
      rl.close();
      return;
    }

    // Step 4: Update each video
    console.log('\n📝 Updating videos...');
    let successCount = 0;
    let errorCount = 0;

    for (const video of videosToUpdate) {
      try {
        await axios.put(
          `${baseURL}/videos/${video.id}`,
          { privacy: 4 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`  ✅ ${video.name}`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ ${video.name}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`✅ Successfully updated: ${successCount}`);
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount}`);
    }
    console.log('Done!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data?.error || error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Tip: Make sure you entered just the domain without http:// or https://');
      console.error('   Example: course-connect.ab-civil.com');
    }
    if (error.response?.status === 401) {
      console.error('\n💡 Tip: Check your username and password');
    }
  }

  rl.close();
}

main();
