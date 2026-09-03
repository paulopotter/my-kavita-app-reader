import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { ServerGroupInfo, ServerUrlInfo, UrlProbeResult } from '../../../../../shared/bridge';
import type { Strings } from '../../../../../shared/i18n';
import { UrlTool } from '../../../../../shared/tools/url';
import { Select } from '../select';
import { styles } from './url-modal.styles';

// The "link this URL to a server" section — only rendered for a metadata-server URL. The screen
// passes the list of servers (already just one today) + a resolver for a picked server's URLs.
export interface UrlLinkOptions {
  servers: ServerGroupInfo[];
  urlsOf: (serverGroupId: string) => Promise<ServerUrlInfo[]>;
  initialServerGroupId?: string;
  initialServerUrlId?: string;
}

// Add / edit one URL: address + priority + a "test connection" that only checks THIS url is
// reachable (never changes which URL is active — that's the group section's own test). Dumb: the
// screen owns the submit + the probe. `link` is optional — present only for a metadata URL, and
// then this also renders the "associate to a server / a server URL" pickers.
export interface UrlModalProps {
  t: Strings;
  mode: 'add' | 'edit';
  initialUrl?: string;
  initialPriority: number;
  submitError?: string | null;
  link?: UrlLinkOptions;
  onTest: (url: string) => Promise<UrlProbeResult>;
  onSubmit: (url: string, priority: number, linkedServerUrlId?: string) => void;
  onClose: () => void;
}

export function UrlModal({
  t,
  mode,
  initialUrl = '',
  initialPriority,
  submitError,
  link,
  onTest,
  onSubmit,
  onClose,
}: UrlModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [priority, setPriority] = useState(String(initialPriority));
  const [urlError, setUrlError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  // ── link state (metadata URL only) ──
  const [associate, setAssociate] = useState(link?.initialServerUrlId != null);
  const [serverGroupId, setServerGroupId] = useState<string | undefined>(
    link?.initialServerGroupId ?? link?.servers[0]?.id,
  );
  const [serverUrls, setServerUrls] = useState<ServerUrlInfo[]>([]);
  const [serverUrlId, setServerUrlId] = useState<string | undefined>(link?.initialServerUrlId);

  useEffect(() => {
    if (!link || !associate || !serverGroupId) {
      setServerUrls([]);
      return;
    }
    link.urlsOf(serverGroupId).then(setServerUrls).catch(() => setServerUrls([]));
  }, [link, associate, serverGroupId]);

  const urlValid = UrlTool.isValid(url);

  const handleTest = async () => {
    if (!urlValid) {
      setUrlError(t.serverErrorUrlInvalid);
      return;
    }
    setUrlError('');
    setTesting(true);
    setTestResult(null);
    const result = await onTest(url);
    setTestResult(result.ok ? 'ok' : 'fail');
    setTesting(false);
  };

  const handleSubmit = () => {
    if (!urlValid) {
      setUrlError(t.serverErrorUrlInvalid);
      return;
    }
    const linkedUrlId = link && associate ? serverUrlId : undefined;
    onSubmit(url, parseInt(priority, 10) || 0, linkedUrlId);
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'add' ? t.urlModalNewTitle : t.urlModalEditTitle}</Text>
            <Text onPress={onClose} style={styles.close} suppressHighlighting>
              ✕
            </Text>
          </View>

          <Text style={styles.label}>{t.urlModalUrlLabel}</Text>
          <TextInput
            style={[styles.input, urlError ? styles.inputError : null]}
            value={url}
            onChangeText={v => {
              setUrl(v);
              setUrlError('');
              setTestResult(null);
            }}
            placeholder={t.urlModalUrlPlaceholder}
            placeholderTextColor="#4A5568"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {urlError ? <Text style={styles.errorTxt}>{urlError}</Text> : null}

          <Text style={styles.label}>{t.serverFormPriorityLabel}</Text>
          <TextInput
            style={styles.input}
            value={priority}
            onChangeText={v => setPriority(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#4A5568"
          />

          {link && (
            <>
              <Text style={styles.label}>{t.urlModalServerLabel}</Text>
              <Select
                value={serverGroupId}
                placeholder={t.urlModalPickServer}
                options={link.servers.map(sg => ({ id: sg.id, label: sg.name }))}
                onChange={id => {
                  setServerGroupId(id);
                  setServerUrlId(undefined);
                }}
              />

              <TouchableOpacity
                style={styles.assocToggle}
                onPress={() => {
                  const next = !associate;
                  setAssociate(next);
                  if (!next) {setServerUrlId(undefined);}
                }}>
                <View style={[styles.checkbox, associate && styles.checkboxOn]}>
                  {associate && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.assocLabel}>{t.urlModalAssociateToUrl}</Text>
              </TouchableOpacity>

              {associate &&
                (serverUrls.length === 0 ? (
                  <Text style={styles.testMuted}>{t.urlModalNoUrlsInServer}</Text>
                ) : (
                  <Select
                    value={serverUrlId}
                    placeholder={t.urlModalPickUrl}
                    options={serverUrls.map(su => ({ id: su.id, label: su.url }))}
                    onChange={setServerUrlId}
                  />
                ))}
            </>
          )}

          <View style={styles.testRow}>
            <TouchableOpacity
              style={[styles.testBtn, testing && styles.testBtnBusy]}
              onPress={handleTest}
              disabled={testing}>
              {testing ? (
                <View style={styles.testStatus}>
                  <ActivityIndicator size="small" color="#E94560" />
                  <Text style={styles.testTxt}>{t.urlModalTesting}</Text>
                </View>
              ) : (
                <Text style={styles.testTxt}>{t.urlModalTestConnection}</Text>
              )}
            </TouchableOpacity>
            {!testing && testResult === 'ok' && <Text style={styles.testOk}>{t.urlModalTestOk}</Text>}
            {!testing && testResult === 'fail' && <Text style={styles.testFail}>{t.urlModalTestFail}</Text>}
          </View>

          {submitError ? <Text style={styles.errorTxt}>✗ {submitError}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>{t.serverFormCancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !urlValid && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={!urlValid}>
              <Text style={styles.saveTxt}>{t.serverFormSave}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
