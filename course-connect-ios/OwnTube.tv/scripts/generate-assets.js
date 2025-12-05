const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const assetsDir = path.join(__dirname, "..", "assets");
const sourceLogo = path.join(assetsDir, "ab-civil-primary-blue.png");
const sourceWhite = path.join(assetsDir, "ab-civil-white.png");

async function generateAssets() {
  console.log("Generating assets from AB Civil logo...\n");

  // 1. App Icon (1024x1024) - logo with padding on white background
  console.log("Creating app icon (1024x1024)...");
  const logoBuffer = await sharp(sourceLogo)
    .resize(700, 700, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logoBuffer, gravity: "center" }])
    .png()
    .toFile(path.join(assetsDir, "icon.png"));
  console.log("  -> icon.png created");

  // 2. Adaptive Icon Foreground (1024x1024) - same as icon
  console.log("Creating adaptive icon foreground (1024x1024)...");
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logoBuffer, gravity: "center" }])
    .png()
    .toFile(path.join(assetsDir, "adaptive-icon-foreground.png"));
  console.log("  -> adaptive-icon-foreground.png created");

  // 3. Favicon (48x48) - transparent background
  console.log("Creating favicon (48x48)...");
  await sharp(sourceLogo)
    .resize(48, 48, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, "favicon.png"));
  console.log("  -> favicon.png created");

  // 3b. Favicon Dark (48x48) - white logo for dark mode
  console.log("Creating favicon-dark (48x48)...");
  await sharp(sourceWhite)
    .resize(48, 48, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, "favicon-dark.png"));
  console.log("  -> favicon-dark.png created");

  // 4. Splash screen (1284x2778 - iPhone 14 Pro Max size)
  console.log("Creating splash screen (1284x2778)...");
  const splashLogoBuffer = await sharp(sourceLogo)
    .resize(500, 500, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: splashLogoBuffer, gravity: "center" }])
    .png()
    .toFile(path.join(assetsDir, "splash.png"));
  console.log("  -> splash.png created");

  // 5. Android TV Banner (320x180)
  console.log("Creating Android TV banner (320x180)...");
  const tvBannerLogo = await sharp(sourceLogo)
    .resize(120, 120, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 320,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: tvBannerLogo, gravity: "center" }])
    .png()
    .toFile(path.join(assetsDir, "android-tv-banner.png"));
  console.log("  -> android-tv-banner.png created");

  // 6. Apple TV Assets
  const appleTVDir = path.join(assetsDir, "appleTV");

  // Helper function to create TV banners
  async function createTVBanner(width, height, filename, logoSize) {
    const tvLogo = await sharp(sourceLogo)
      .resize(logoSize, logoSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: tvLogo, gravity: "center" }])
      .png()
      .toFile(path.join(appleTVDir, filename));
    console.log(`  -> appleTV/${filename} created`);
  }

  console.log("Creating Apple TV assets...");
  await createTVBanner(1280, 768, "icon_1280x768.png", 500);
  await createTVBanner(400, 240, "iconSmall_400x240.png", 160);
  await createTVBanner(800, 480, "iconSmall2x_800x480.png", 320);
  await createTVBanner(1920, 720, "topShelf_1920x720.png", 480);
  await createTVBanner(3840, 1440, "topShelf2x_3840x1440.png", 960);
  await createTVBanner(2320, 720, "topShelfWide_2320x720.png", 480);
  await createTVBanner(4640, 1440, "topShelfWide2x_4640x1440.png", 960);

  // 7. Update course-connect logo files
  console.log("Updating course-connect logo files...");
  await sharp(sourceLogo).toFile(path.join(assetsDir, "course-connect-logo-blue.png"));
  console.log("  -> course-connect-logo-blue.png created");

  await sharp(sourceWhite).toFile(path.join(assetsDir, "course-connect-logo-white.png"));
  console.log("  -> course-connect-logo-white.png created");

  const sourceCharcoal = path.join(assetsDir, "ab-civil-charcoal.png");
  await sharp(sourceCharcoal).toFile(path.join(assetsDir, "course-connect-logo-charcoal.png"));
  console.log("  -> course-connect-logo-charcoal.png created");

  // 8. Custom logo (same as blue)
  console.log("Updating custom-logo.png...");
  await sharp(sourceLogo).toFile(path.join(assetsDir, "custom-logo.png"));
  console.log("  -> custom-logo.png created");

  // 9. Public logo for sidebar (192x192) - transparent background
  const publicDir = path.join(__dirname, "..", "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  console.log("Creating public/logo192.png (192x192)...");
  await sharp(sourceLogo)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, "logo192.png"));
  console.log("  -> public/logo192.png created");

  console.log("\nAll assets generated successfully!");
}

generateAssets().catch(console.error);
