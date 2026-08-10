const { withGradleProperties } = require('expo/config-plugins');

const GRADLE_PROPS = {
  'org.gradle.jvmargs':
    '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
  // Avoid Metaspace OOMs from lintVital* during local/release APK builds.
  'android.lint.checkReleaseBuilds': 'false',
};

/** Raise Gradle memory and skip release lint that OOMs on local EAS builds. */
function withGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    for (const [key, value] of Object.entries(GRADLE_PROPS)) {
      const existing = config.modResults.find(
        (item) => item.type === 'property' && item.key === key,
      );
      if (existing) {
        existing.value = value;
      } else {
        config.modResults.push({ type: 'property', key, value });
      }
    }
    return config;
  });
}

module.exports = withGradleMemory;
