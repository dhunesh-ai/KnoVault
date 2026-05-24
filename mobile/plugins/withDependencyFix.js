const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withDependencyFix(config) {
  return withProjectBuildGradle(config, async (config) => {
    const buildGradle = config.modResults.contents;
    
    // Add subprojects block to exclude support library
    const fixBlock = `
subprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.16.0'
            force 'androidx.appcompat:appcompat:1.7.0'
            force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
            force 'androidx.annotation:annotation:1.9.1'
            
            dependencySubstitution {
                substitute module('com.android.support:support-compat') using module('androidx.core:core:1.16.0')
                substitute module('com.android.support:support-v4') using module('androidx.legacy:legacy-support-v4:1.0.0')
                substitute module('com.android.support:versionedparcelable') using module('androidx.versionedparcelable:versionedparcelable:1.1.1')
                substitute module('com.android.support:localbroadcastmanager') using module('androidx.localbroadcastmanager:localbroadcastmanager:1.0.0')
                substitute module('com.android.support:support-annotations') using module('androidx.annotation:annotation:1.9.1')
            }
        }
        exclude group: 'com.android.support', module: 'support-compat'
        exclude group: 'com.android.support', module: 'support-v4'
        exclude group: 'com.android.support', module: 'versionedparcelable'
        exclude group: 'com.android.support', module: 'localbroadcastmanager'
        exclude group: 'com.android.support', module: 'support-vector-drawable'
        exclude group: 'com.android.support', module: 'animated-vector-drawable'
    }
}
`;

    if (!buildGradle.includes("subprojects {")) {
      config.modResults.contents = buildGradle + fixBlock;
    }

    return config;
  });
};
