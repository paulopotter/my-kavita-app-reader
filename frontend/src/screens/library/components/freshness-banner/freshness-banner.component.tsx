import React from 'react';
import { Text, View } from 'react-native';
import { styles } from './freshness-banner.styles';

// Dumb component: one pre-assembled string + a variant. All wording / date formatting is done in
// the screen (from the hook's bannerState + DateTool + Strings); this only renders.
export type FreshnessBannerVariant = 'stale' | 'offline' | 'confirmed';

export interface FreshnessBannerProps {
  variant: FreshnessBannerVariant;
  text: string;
}

export const FreshnessBanner = React.memo(function FreshnessBanner({ variant, text }: FreshnessBannerProps) {
  return (
    <View style={[styles.strip, styles[variant]]}>
      <Text style={styles.text} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
});
