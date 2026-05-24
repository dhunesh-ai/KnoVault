const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withPackagingFix(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Add packaging block with exclusions if not already present
    const packagingBlock = `
    packaging {
        resources {
            pickFirsts += ["META-INF/androidx.localbroadcastmanager_localbroadcastmanager.version"]
            excludes += ["**/androidx.localbroadcastmanager_localbroadcastmanager.version"]
        }
    }
`;

    if (!buildGradle.includes("packaging {")) {
      // Find the android block and insert inside it
      const androidMatch = buildGradle.match(/android\s*{/);
      if (androidMatch) {
        const insertIndex = androidMatch.index + androidMatch[0].length;
        config.modResults.contents = buildGradle.slice(0, insertIndex) + packagingBlock + buildGradle.slice(insertIndex);
      }
    }

    return config;
  });
};
