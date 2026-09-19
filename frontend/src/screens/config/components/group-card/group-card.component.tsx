import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Circle, Check, MoreHorizontal, X } from 'lucide-react-native';
import type { ProviderCredentialField } from '../../../../shared/bridge';
import { useTheme } from '../../../../shared/theme';
import { Row } from '../row';
import { makeStyles } from './group-card.styles';

// One server section: the header (name + a "more" menu), the masked credential rows the provider declares,
// and the URL list with its add / test buttons. Dumb — every action is a prop the screen wires
// to the right hook (useServer or useMetadataServer).
export interface GroupCardUrl {
  id: string;
  url: string;
  priority: number;
}

export interface GroupCardProps {
  name: string;
  credentialFields: ProviderCredentialField[];
  maskCredential: (fieldName: string) => string | null;
  onGroupMenu: () => void;

  urls: GroupCardUrl[];
  activeUrlId: string | null;
  canAddUrl: boolean;
  onUrlMenu: (urlId: string) => void;
  onAddUrl: () => void;
  // Optional "↳ …" sub-line under a URL row (a metadata URL's link to a server URL). Returns
  // undefined for rows with no sub-line.
  urlSubline?: (urlId: string) => string | undefined;

  // Omitted entirely → no "test connection" section rendered (config/notifications doesn't have
  // a group-level connection test, only the per-URL test in its own UrlModal).
  connTesting?: boolean;
  connMessage?: string;
  connStatus?: 'idle' | 'testing' | 'ok' | 'error';
  onTestConnection?: () => void;

  strings: {
    urls: string;
    addUrl: string;
    testConnection?: string;
    testing?: string;
    connectionOk?: string;
  };
}

export function GroupCard({
  name,
  credentialFields,
  maskCredential,
  onGroupMenu,
  urls,
  activeUrlId,
  canAddUrl,
  onUrlMenu,
  onAddUrl,
  urlSubline,
  connTesting,
  connMessage,
  connStatus,
  onTestConnection,
  strings,
}: GroupCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerName}>
          <Circle size={8} color={colors.icon.status.good} fill={colors.icon.status.good} />
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <TouchableOpacity onPress={onGroupMenu} hitSlop={8}>
          <MoreHorizontal size={20} color={colors.icon.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {credentialFields.map(f => {
          const masked = maskCredential(f.name);
          if (!masked) {return null;}
          return (
            <View key={f.name}>
              <Text style={styles.subLabel}>{f.label}</Text>
              <View style={styles.credRow}>
                <Text style={styles.credValue}>{masked}</Text>
              </View>
            </View>
          );
        })}

        <Text style={styles.subLabel}>{strings.urls}</Text>
        {urls.map(u => {
          const subline = urlSubline?.(u.id);
          return (
            <Row
              key={u.id}
              active={activeUrlId === u.id}
              primary={u.url}
              secondary={subline ? `↳ ${subline}` : undefined}
              trailing={`P${u.priority}`}
              onMenu={() => onUrlMenu(u.id)}
            />
          );
        })}

        {canAddUrl && (
          <TouchableOpacity style={styles.addDashedBtn} onPress={onAddUrl}>
            <Text style={styles.addDashedTxt}>{strings.addUrl}</Text>
          </TouchableOpacity>
        )}

        {onTestConnection && urls.length > 0 && (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, connTesting && styles.btnDisabled]}
                onPress={onTestConnection}
                disabled={connTesting}>
                <Text style={styles.outlineTxt}>{connTesting ? strings.testing : strings.testConnection}</Text>
              </TouchableOpacity>
            </View>
            {connStatus === 'ok' && (
              <View style={styles.msgRow}>
                <Check size={14} color={colors.icon.message.good} />
                <Text style={styles.msgOk}>{`${strings.connectionOk}: ${connMessage}`}</Text>
              </View>
            )}
            {connStatus === 'error' && (
              <View style={styles.msgRow}>
                <X size={14} color={colors.icon.message.bad} />
                <Text style={styles.msgError}>{connMessage}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
