import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useStyles, useTheme } from '../../../shared/context';
import { useStrings } from '../../../shared/i18n';
import type { AdultFilterMode } from '../../../shared/tools/adult-filter';
import { BackChevron, Select } from '../components';
import { configStyles } from '../config.styles';
import { useAdultFilterConfig } from './adult.hooks';
import { adultStyles } from './adult.styles';

// Adult-content filter settings: which categories count as adult, how to show those series
// (hidden by default), and — when they are shown — whether to take the blur off. The filter
// itself runs on every screen at render time; this screen only edits the choices.
export function AdultFilterScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const chrome = useStyles(configStyles);
  const styles = useStyles(adultStyles);
  const t = useStrings();
  const { mode, unblur, selected, available, status, showsAdult, setMode, setUnblur, toggleCategory } =
    useAdultFilterConfig();

  const modeOptions = useMemo(
    () => [
      { id: 'hidden', label: t.adultModeHidden },
      { id: 'blur', label: t.adultModeBlur },
      { id: 'normal', label: t.adultModeNormal },
      { id: 'adultOnly', label: t.adultModeOnly },
    ],
    [t],
  );

  const switchColors = (on: boolean) => ({
    thumbColor: on ? colors.button.switch.thumb.on : colors.button.switch.thumb.off,
    trackColor: { false: colors.button.switch.track.off, true: colors.button.switch.track.on },
  });

  return (
    <View style={chrome.root}>
      <View style={chrome.subHeader}>
        <BackChevron onPress={onBack} />
        <Text style={chrome.subTitle}>{t.configMenuAdult}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>{t.adultMode}</Text>
        <Select
          value={mode}
          options={modeOptions}
          onChange={id => id && setMode(id as AdultFilterMode)}
        />

        {showsAdult && (
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => setUnblur(!unblur)}>
            <Text style={styles.label}>{t.adultUnblur}</Text>
            <Switch value={unblur} onValueChange={setUnblur} {...switchColors(unblur)} />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>{t.adultCategories}</Text>
        <Text style={styles.hint}>{t.adultCategoriesHint}</Text>
        {status === 'loading' && <ActivityIndicator color={colors.button.primary} />}
        {status === 'error' && <Text style={styles.error}>{t.adultCategoriesError}</Text>}
        {status === 'ready' && available.length === 0 && <Text style={styles.message}>{t.adultCategoriesEmpty}</Text>}
        {status === 'ready' &&
          available.map(name => {
            const on = selected.includes(name);
            return (
              <View key={name}>
                <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => toggleCategory(name)}>
                  <Text style={styles.label}>{name}</Text>
                  <Switch value={on} onValueChange={() => toggleCategory(name)} {...switchColors(on)} />
                </TouchableOpacity>
                <View style={chrome.divider} />
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}
