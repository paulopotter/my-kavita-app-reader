import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { BackChevron } from '../components';
import { makeStyles as makeChrome } from '../config.styles';
import { Section } from './components/section';
import { useDebugIds } from './debug.hooks';
import {
  chapterSteps,
  discoverFirstChapterId,
  discoverFirstSeriesId,
  externalSteps,
  pageSteps,
  serialExternalDetailSteps,
  serialSteps,
  serverServiceSteps,
  serverSteps,
  type SmokeTestStep,
} from './debug.steps';

// Task 021 RN Services smoke test — one Section per domain (Server, ServerService, Serials,
// Chapters, Pages, External), each with its own Run button and result list. Unlocked from the
// Config menu by tapping the version footer.
export function DebugScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const chrome = useMemo(() => makeChrome(colors), [colors]);
  const {
    groupId,
    setGroupId,
    seriesId,
    setSeriesId,
    chapterId,
    setChapterId,
    pageIndex,
    setPageIndex,
    externalGroupId,
    setExternalGroupId,
  } = useDebugIds();

  const runAll = async (runners: Array<() => Promise<SmokeTestStep>>): Promise<SmokeTestStep[]> => {
    const results: SmokeTestStep[] = [];
    for (const run of runners) {results.push(await run());}
    return results;
  };

  return (
    <View style={chrome.root}>
      <View style={chrome.subHeader}>
        <BackChevron onPress={onBack} />
        <Text style={chrome.subTitle}>Debug</Text>
      </View>

      <ScrollView contentContainerStyle={chrome.scroll}>
        <Section
          title="Server"
          idLabel="groupId"
          idValue={groupId}
          onIdChange={setGroupId}
          disabled={!groupId}
          onRun={() => runAll(serverSteps(groupId))}
        />

        <Section
          title="ServerService (session)"
          idLabel="groupId"
          idValue={groupId}
          onIdChange={setGroupId}
          disabled={!groupId}
          onRun={() => runAll(serverServiceSteps(groupId))}
        />

        <Section
          title="Serials / SerialService"
          idLabel="seriesId"
          idValue={seriesId}
          onIdChange={setSeriesId}
          onRun={async () => {
            let id = seriesId;
            if (!id) {
              const discovered = await discoverFirstSeriesId();
              if (discovered) {
                id = discovered;
                setSeriesId(discovered);
              }
            }
            if (!id) {return [{ label: 'SerialsService.list', ok: false, detail: 'no seriesId — type one in manually' }];}
            return [...(await runAll(serialSteps(id))), ...(await runAll(serialExternalDetailSteps(id)))];
          }}
        />

        <Section
          title="External (:external-metadata-server)"
          idLabel="externalGroupId"
          idValue={externalGroupId}
          onIdChange={setExternalGroupId}
          disabled={!externalGroupId}
          onRun={() => runAll(externalSteps(externalGroupId))}
        />

        <Section
          title="ChapterService"
          idLabel="chapterId"
          idValue={chapterId}
          onIdChange={setChapterId}
          disabled={!seriesId}
          onRun={async () => {
            let id = chapterId;
            if (!id) {
              const discovered = await discoverFirstChapterId(seriesId);
              if (discovered) {
                id = discovered;
                setChapterId(discovered);
              }
            }
            if (!id) {return [{ label: 'raw.chapters.list', ok: false, detail: 'no chapterId — type one in manually' }];}
            return runAll(chapterSteps(seriesId, id));
          }}
        />

        <Section
          title="PageService"
          idLabel="pageIndex"
          idValue={pageIndex}
          onIdChange={setPageIndex}
          disabled={!seriesId || !chapterId}
          onRun={() => runAll(pageSteps(seriesId, chapterId, Number(pageIndex) || 0))}
        />
      </ScrollView>
    </View>
  );
}
