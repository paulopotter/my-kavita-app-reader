import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { makeStyles } from './freshness-banner.styles';
import { useTheme } from '../../../../shared/theme';

// Dumb component: one pre-assembled string + a variant. All wording / date formatting is done in
// the screen (from the hook's bannerState + DateTool + Strings); this only renders.
export type FreshnessBannerVariant = 'stale' | 'offline' | 'confirmed';

export interface FreshnessBannerProps {
  variant: FreshnessBannerVariant;
  text: string;
}

export const FreshnessBanner = React.memo(function FreshnessBanner({ variant, text }: FreshnessBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.strip, styles[variant]]}>
      <Text style={styles.text} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
});
