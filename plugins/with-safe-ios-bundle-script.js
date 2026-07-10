const { withXcodeProject } = require('@expo/config-plugins');

const SCRIPT_MARKER = 'react-native-xcode.sh';
const SAFE_INVOCATION_MARKER = '$REACT_NATIVE_XCODE_SCRIPT';

function quoteReactNativeBundleScript(shellScript) {
  if (
    typeof shellScript !== 'string' ||
    !shellScript.includes(SCRIPT_MARKER) ||
    shellScript.includes(SAFE_INVOCATION_MARKER)
  ) {
    return shellScript;
  }

  const lines = shellScript.split('\\n');
  const invocationIndex = lines.findIndex((line) => line.includes(SCRIPT_MARKER));

  if (invocationIndex === -1) {
    return shellScript;
  }

  lines.splice(
    invocationIndex,
    1,
    'REACT_NATIVE_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\")\\"',
    '\\"$REACT_NATIVE_XCODE_SCRIPT\\"',
  );

  return lines.join('\\n');
}

module.exports = function withSafeIosBundleScript(config) {
  return withXcodeProject(config, (configWithProject) => {
    const shellScriptPhases =
      configWithProject.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};
    let foundBundlePhase = false;

    for (const [key, phase] of Object.entries(shellScriptPhases)) {
      if (key.endsWith('_comment') || typeof phase?.shellScript !== 'string') {
        continue;
      }

      if (!phase.shellScript.includes(SCRIPT_MARKER)) {
        continue;
      }

      foundBundlePhase = true;
      phase.shellScript = quoteReactNativeBundleScript(phase.shellScript);
    }

    if (!foundBundlePhase) {
      throw new Error('iOS React Native bundle build phase를 찾지 못했습니다.');
    }

    return configWithProject;
  });
};

