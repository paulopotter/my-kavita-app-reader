import React from 'react';
import { Text, View } from 'react-native';
import { freshnessBannerStyles } from './freshness-banner.styles';
import { useStyles } from '../../../../shared/context';

// Dumb component: one pre-assembled string + a variant. All wording / date formatting is done in
// the screen (from the hook's bannerState + DateTool + Strings); this only renders.
export type FreshnessBannerVariant = 'stale' | 'offline' | 'confirmed';

export interface FreshnessBannerProps {
  variant: FreshnessBannerVariant;
  text: string;
}

export const FreshnessBanner = React.memo(function FreshnessBanner({ variant, text }: FreshnessBannerProps) {
  const styles = useStyles(freshnessBannerStyles);
  return (
    <View style={[styles.strip, styles[variant]]}>
      <Text style={styles.text} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
});
