const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withGradlePropertiesFix(config) {
  return withGradleProperties(config, (config) => {
    config.modResults.push({
      type: "property",
      key: "android.enableJetifier",
      value: "true",
    });
    config.modResults.push({
      type: "property",
      key: "android.useAndroidX",
      value: "true",
    });
    return config;
  });
};
