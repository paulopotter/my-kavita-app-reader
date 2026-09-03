import React, { useEffect } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { OtaModule } from '../../native/OtaModule';
import { AppVersions } from '../../shared/components/app-versions';
import { useStrings } from '../../shared/i18n/i18n.hooks';
import { Progress, SplashAlert } from './components';
import { useSplash } from './hooks';
import { styles } from './splash.styles';

// The RN splash — the RootNavigator's initial route. It owns useSplash (every rule lives there,
// including turning the boot outcome into a `navigate` object) and just forwards that to
// navigation.reset() once it's set. Presentation: the logo (same asset + size as the native
// splash so the handoff doesn't resize it), the progress bar, the version footer, the
// always-mounted-but-usually-hidden update button, and the OTA alert.
export function SplashScreen() {
  const t = useStrings();
  const navigation = useNavigation<any>();
  const { progress, progressLabel, otaUpdateReady, otaAlert, navigate } = useSplash();

  useEffect(() => {
    if (navigate) {
      navigation.reset(navigate);
    }
  }, [navigate, navigation]);

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
        <SplashAlert
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
