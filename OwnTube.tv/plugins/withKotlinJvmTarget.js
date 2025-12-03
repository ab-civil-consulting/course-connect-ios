/* eslint-env node */
const { withProjectBuildGradle } = require("@expo/config-plugins");

function withKotlinJvmTarget(config) {
  return withProjectBuildGradle(config, (config) => {
    const buildGradleContent = config.modResults.contents;

    // Check if JVM toolchain configuration already exists
    if (buildGradleContent.includes("Configure JVM toolchain")) {
      return config;
    }

    // Add JVM toolchain configuration after allprojects block
    const jvmToolchainConfig = `
// Configure JVM toolchain for consistent Java/Kotlin compilation
subprojects {
  afterEvaluate { project ->
    if (project.plugins.hasPlugin('org.jetbrains.kotlin.android') || project.plugins.hasPlugin('kotlin-android')) {
      project.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
          jvmTarget = "17"
        }
      }
    }
  }
}
`;

    // Insert before the expo-root-project plugin
    const expoRootPluginPattern = /apply plugin: "expo-root-project"/;
    if (expoRootPluginPattern.test(buildGradleContent)) {
      config.modResults.contents = buildGradleContent.replace(
        expoRootPluginPattern,
        `${jvmToolchainConfig}\napply plugin: "expo-root-project"`
      );
    } else {
      // Fallback: append at the end
      config.modResults.contents = buildGradleContent + jvmToolchainConfig;
    }

    return config;
  });
}

module.exports = withKotlinJvmTarget;
