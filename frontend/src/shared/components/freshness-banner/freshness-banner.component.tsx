import React from 'react';
import { Text, View } from 'react-native';
import { freshnessBannerStyles } from './freshness-banner.styles';
import { useStyles } from '../../context';

// Dumb component: one pre-assembled string + a variant. All wording / date formatting is done by
// the caller (from its own state + DateTool + Strings); this only renders.
//
// Shared rather than owned by one screen: the Library reports how fresh its listing is, and the
// serial page reports when enrichment data is missing — same strip, same variants, so it lives
// where both can reach it.
export type FreshnessBannerVariant = 'stale' | 'offline' | 'confirmed' | 'bad';

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
