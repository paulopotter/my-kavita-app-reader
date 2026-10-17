import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useStyles, useTheme } from '../../../shared/context';
import { useStrings } from '../../../shared/i18n';
import { BackChevron } from '../components';
import { configStyles } from '../config.styles';
import { Chip } from './components/chip';
import { useAdultFilterConfig } from './adult.hooks';
import { adultStyles } from './adult.styles';

// Sensitive-content filter settings: which categories are in the filter (chips that move into a
// box as they are picked), one switch to reveal those series blurred (hidden by default), whether
// to take the blur off, and a button that flips the app into the inverted view for this session only. The filter
// itself runs on every screen at render time; this screen only edits the choices.
export function AdultFilterScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const chrome = useStyles(configStyles);
  const styles = useStyles(adultStyles);
  const t = useStrings();
  const {
    reveal,
    unblur,
    selected,
    available,
    status,
    only,
    setReveal,
    setUnblur,
    setOnly,
    addCategory,
    removeCategory,
  } = useAdultFilterConfig();

  const pending = useMemo(() => available.filter(name => !selected.includes(name)), [available, selected]);

  return (
    <View style={chrome.root}>
      <View style={chrome.subHeader}>
        <BackChevron onPress={onBack} />
        <Text style={chrome.subTitle}>{t.configMenuAdult}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => setReveal(!reveal)}>
          <Text style={styles.label}>{t.adultReveal}</Text>
          <Switch
            value={reveal}
            onValueChange={setReveal}
            thumbColor={reveal ? colors.button.switch.thumb.on : colors.button.switch.thumb.off}
            trackColor={{ false: colors.button.switch.track.off, true: colors.button.switch.track.on }}
          />
        </TouchableOpacity>
        <Text style={styles.hint}>{t.adultRevealHint}</Text>

        {reveal && (
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => setUnblur(!unblur)}>
            <Text style={styles.label}>{t.adultUnblur}</Text>
            <Switch
              value={unblur}
              onValueChange={setUnblur}
              thumbColor={unblur ? colors.button.switch.thumb.on : colors.button.switch.thumb.off}
              trackColor={{ false: colors.button.switch.track.off, true: colors.button.switch.track.on }}
            />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>{t.adultCategories}</Text>
        <Text style={styles.hint}>{t.adultCategoriesHint}</Text>

        <Text style={styles.hint}>{t.adultCategoriesSelected}</Text>
        <View style={styles.selectedBox}>
          {selected.length === 0 ? (
            <Text style={styles.placeholder}>{t.adultCategoriesNoneSelected}</Text>
          ) : (
            selected.map(name => (
              <Chip
                key={name}
                label={name}
                selected
                removeLabel={t.adultCategoriesRemove.replace('{0}', name)}
                onPress={() => removeCategory(name)}
              />
            ))
          )}
        </View>

        <Text style={[styles.hint, styles.sectionLabel]}>{t.adultCategoriesAvailable}</Text>
        {status === 'loading' && <ActivityIndicator color={colors.button.primary} />}
        {status === 'error' && <Text style={styles.error}>{t.adultCategoriesError}</Text>}
        {status === 'ready' && available.length === 0 && <Text style={styles.message}>{t.adultCategoriesEmpty}</Text>}
        {status === 'ready' && (
          <View style={styles.chips}>
            {pending.map(name => (
              <Chip key={name} label={name} onPress={() => addCategory(name)} />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.onlyButton, only && styles.onlyButtonActive]}
          activeOpacity={0.8}
          onPress={() => setOnly(!only)}>
          <Text style={[styles.onlyButtonText, only && styles.onlyButtonTextActive]}>
            {only ? t.adultOnlyButtonOff : t.adultOnlyButton}
          </Text>
        </TouchableOpacity>
        <Text style={styles.hint}>{t.adultOnlyHint}</Text>
      </ScrollView>
    </View>
  );
}
