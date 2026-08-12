import React from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { OtaModule } from '../../native/OtaModule';
import { AppAlert } from '../../shared/components/AppAlert';
import { AppVersions } from '../../shared/components/AppVersions';
import { useStrings } from '../../shared/i18n/useStrings';
import { SplashState } from './useSplash';

const BG = '#1A1A2E';
const ACCENT = '#E94560';
const BAR_TRACK = 'rgba(255,255,255,0.15)';

type Props = Pick<SplashState, 'progress' | 'otaUpdateReady' | 'otaPolicy' | 'onPolicyDismissed'>;

export function SplashScreen({ progress, otaUpdateReady, otaPolicy, onPolicyDismissed }: Props) {
  const t = useStrings();

  const isRequired = otaPolicy?.mode === 'required';
  const isHighlyRec = otaPolicy?.mode === 'highly_recommended';

  function handleOpenNotes() {
    if (otaPolicy?.releaseNotesUrl) {
      Linking.openURL(otaPolicy.releaseNotesUrl).catch(() => undefined);
    }
    if (!isRequired) { onPolicyDismissed('open_notes'); }
  }

  const alertTitle = isRequired
    ? t.otaRequiredTitle
    : isHighlyRec
      ? t.otaHighlyRecTitle
      : t.otaRecommendedTitle;

  const alertMessage = isRequired ? t.otaRequiredBody : t.otaAdvisoryBody;

  const alertButtons = isRequired
    ? [{ label: t.otaViewNotes, variant: 'primary' as const, onPress: handleOpenNotes }]
    : [
        { label: t.otaDismiss, variant: 'secondary' as const, onPress: () => onPolicyDismissed('dismiss') },
        { label: t.otaViewNotes, variant: 'primary' as const, onPress: handleOpenNotes },
      ];

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Image
          source={require('../../assets/ic_splash.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>

        {otaUpdateReady && (
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => OtaModule.applyOtaUpdate()}
          >
            <Text style={styles.updateButtonText}>{t.splashUpdateButton}</Text>
          </TouchableOpacity>
        )}

        <AppVersions t={t} />
      </View>

      {otaPolicy && (
        <AppAlert
          visible
          title={alertTitle}
          message={alertMessage}
          buttons={alertButtons}
          // required is not dismissible — user must tap the button
          dismissible={!isRequired}
          onDismiss={!isRequired ? () => onPolicyDismissed('dismiss') : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 32,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 12,
  },
  barTrack: {
    width: '100%',
    height: 3,
    backgroundColor: BAR_TRACK,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  updateButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: ACCENT,
    borderRadius: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
