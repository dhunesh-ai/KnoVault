const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withManifestFix(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    const application = androidManifest.application[0];

    if (application) {
      // Add tools:replace="android:appComponentFactory" and provide the value
      application.$["tools:replace"] = "android:appComponentFactory";
      application.$["android:appComponentFactory"] = "androidx.core.app.CoreComponentFactory";
    }

    return config;
  });
};
