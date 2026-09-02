import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { OtaModule } from '../../native/OtaModule';
import { AppAlert } from '../../shared/components/AppAlert';
import { AppVersions } from '../../shared/components/app-versions';
import { useStrings } from '../../shared/i18n/useStrings';
import { Progress } from './components';
import { styles } from './splash.styles';
import type { SplashState } from './splash.types';

// The screen renders from a SplashState the hook produced. It stays a prop-driven view for now
// because App.tsx mounts it as an overlay and also needs the hook's `destination` to navigate —
// that wiring (screen owns the hook + onDone callback) is folded in with the App.tsx change in a
// later step of Task 038.
type Props = Pick<SplashState, 'progress' | 'progressLabel' | 'otaUpdateReady' | 'otaAlert'>;

// Presentation only. Every rule lives in useSplash — including building `otaAlert` (title / body /
// buttons) from the OTA policy. This wires the hook's output to the pieces: the logo (same asset +
// size as the native splash so the handoff doesn't resize it), the progress bar, the version
// footer, the always-mounted-but-usually-hidden update button, and the generic OTA alert.
export function SplashScreen({ progress, progressLabel, otaUpdateReady, otaAlert }: Props) {
  const t = useStrings();

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Image source={{ uri: 'ic_splash' }} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.footer}>
        <Progress progress={progress} label={progressLabel} />

        {/* Always in the tree, shown only once a downloaded OTA bundle is staged. */}
        {otaUpdateReady ? (
          <TouchableOpacity style={styles.updateButton} onPress={() => OtaModule.applyOtaUpdate()}>
            <Text style={styles.updateButtonText}>{t.splashUpdateButton}</Text>
          </TouchableOpacity>
        ) : null}

        <AppVersions t={t} />
      </View>

      {otaAlert ? (
        <AppAlert
          visible
          title={otaAlert.title}
          message={otaAlert.message}
          buttons={otaAlert.buttons}
          dismissible={otaAlert.dismissible}
        />
      ) : null}
    </View>
  );
}
