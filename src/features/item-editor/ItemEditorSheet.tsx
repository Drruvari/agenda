import { BottomSheet, RNHostView } from '@expo/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Platform } from 'react-native';

import { useToast } from '@/components/ui/ToastProvider';
import { localDateTime, parseLocalDate, useData } from '@/data';
import type { AgendaItem } from '@/data/schema/types';
import {
  createAgendaEvent,
  createAgendaTask,
  deleteAgendaItem,
  updateAgendaItem,
} from '@/domain/agendaLifecycle';
import { parseSmartInput } from '@/lib/smart-parse/parseSmartInput';

import { useItemEditor } from './ItemEditorContext';
import { ItemEditorForm } from './ItemEditorForm';
import {
  type EditorKind,
  draftFromItem,
  editorTitle,
  emptyDraft,
  type ItemEditorDraft,
  type ItemEditorMode,
  recurrenceToRule,
} from './types';

/** Approximate iOS sheet dismiss duration — universal BottomSheet skips onDismiss on programmatic close. */
const IOS_SHEET_DISMISS_MS = 320;

export function ItemEditorHost() {
  const { session, close } = useItemEditor();
  if (!session) return null;

  return <ItemEditorSheet key={sessionKey(session.mode)} mode={session.mode} onDismiss={close} />;
}

function sessionKey(mode: ItemEditorMode): string {
  if (mode.type === 'edit') return `edit-${mode.itemId}`;
  if (mode.type === 'create') return `create-${mode.kind ?? 'task'}`;
  return 'quick-add';
}

function ItemEditorSheet({ mode, onDismiss }: { mode: ItemEditorMode; onDismiss: () => void }) {
  const { repos, ui, settings, refresh } = useData();
  const { showToast } = useToast();
  const sheetHeight = useMemo(() => Math.round(Dimensions.get('window').height * 0.92), []);
  /** Transparent so the BottomSheet’s native surface is the only sheet bg. */
  const sheetHostStyle = useMemo(
    () => ({
      width: '100%' as const,
      height: sheetHeight,
      backgroundColor: 'transparent',
    }),
    [sheetHeight],
  );

  const initialKind: EditorKind =
    mode.type === 'create'
      ? (mode.kind ?? 'task')
      : mode.type === 'quick-add'
        ? settings.editor.defaultAddType
        : 'task';

  const [draft, setDraft] = useState<ItemEditorDraft>(() =>
    emptyDraft(
      ui.selectedDate,
      initialKind,
      ui.activeSpaceId ?? settings.editor.defaultSpaceId ?? '',
      settings.editor.defaultEventDurationMinutes,
    ),
  );
  const [original, setOriginal] = useState<AgendaItem | null>(null);
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(mode.type !== 'edit');
  const [presented, setPresented] = useState(true);
  const closedRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputKey = mode.type === 'edit' ? `edit-${mode.itemId}-${ready}` : `new-${draft.kind}`;

  useEffect(() => {
    void repos.spaces.list().then((list) => {
      setSpaces(list.map((space) => ({ id: space.id, name: space.name })));
    });
  }, [repos.spaces]);

  useEffect(() => {
    if (mode.type !== 'edit') return;
    let cancelled = false;
    void repos.agenda.getById(mode.itemId).then((item) => {
      if (cancelled) return;
      if (!item) {
        showToast('Item not found', { tone: 'error' });
        onDismiss();
        return;
      }
      setOriginal(item);
      setDraft(draftFromItem(item));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, onDismiss, repos.agenda, showToast]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const finishClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    const shouldRefresh = pendingRefreshRef.current;
    pendingRefreshRef.current = false;
    if (shouldRefresh) refresh();
    onDismiss();
  }, [onDismiss, refresh]);

  const patch = useCallback((partial: Partial<ItemEditorDraft>) => {
    setDraft((current) => ({ ...current, ...partial }));
  }, []);

  const onTitleChange = (text: string) => {
    patch({ title: text });

    if (mode.type === 'edit' || draft.kind !== 'task') return;
    if (!settings.editor.smartParsingEnabled) return;

    const parsed = parseSmartInput(text, ui.selectedDate);
    const updates: Partial<ItemEditorDraft> = {};
    if (parsed.date) updates.date = parsed.date;
    if (parsed.time) {
      updates.time = parsed.time;
      updates.timed = true;
    }
    if (parsed.priority) updates.priority = parsed.priority;
    if (parsed.spaceName) {
      const match = spaces.find(
        (space) => space.name.toLowerCase() === parsed.spaceName!.toLowerCase(),
      );
      if (match) updates.spaceId = match.id;
    }
    if (Object.keys(updates).length) patch(updates);
  };

  const heading = editorTitle(mode, draft.kind);
  const canSave =
    !saving &&
    ready &&
    (draft.kind === 'note'
      ? Boolean(draft.title.trim() || draft.details.trim())
      : draft.title.trim().length > 0);
  const showTypePicker = mode.type === 'quick-add' || mode.type === 'create';

  /** Close the sheet first; tear down only after the dismiss animation. */
  const requestClose = useCallback(
    (options?: { refresh?: boolean }) => {
      if (closedRef.current) return;
      if (options?.refresh) pendingRefreshRef.current = true;
      setPresented(false);

      // Universal BottomSheet often skips onDismiss for programmatic close — finish after the animation.
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(
        finishClose,
        Platform.OS === 'ios' ? IOS_SHEET_DISMISS_MS : 250,
      );
    },
    [finishClose],
  );

  const save = async () => {
    const rawTitle = draft.title;
    const rawDetails = draft.details;

    const parsed =
      settings.editor.smartParsingEnabled && draft.kind === 'task' && mode.type !== 'edit'
        ? parseSmartInput(rawTitle, ui.selectedDate)
        : { title: rawTitle.trim() };

    let finalTitle = parsed.title.trim();
    if (draft.kind === 'note' && !finalTitle) {
      finalTitle = rawDetails.trim().split('\n')[0]?.trim().slice(0, 80) || 'Note';
    }
    if (!finalTitle || saving) return;

    setSaving(true);
    try {
      const finalDate = ('date' in parsed && parsed.date) || draft.date;
      const finalTime =
        ('time' in parsed && parsed.time) || (draft.timed && draft.time.trim()) || undefined;
      const spaceId = draft.spaceId || undefined;
      const details = rawDetails.trim() || undefined;
      const recurrence = recurrenceToRule(draft.recurrence);

      if (mode.type === 'edit' && original) {
        if (original.type === 'note') {
          await updateAgendaItem(repos, original, {
            ...original,
            title: finalTitle,
            details,
            date: finalDate,
            time: undefined,
            spaceId,
            priority: 'none',
            reminderAt: undefined,
            notificationId: undefined,
          });
        } else if (original.type === 'event') {
          const remind = Boolean(draft.remindAtTime && (finalTime || !draft.timed));
          const reminderAt =
            remind && finalTime ? localDateTime(finalDate, finalTime)?.toISOString() : undefined;
          await updateAgendaItem(repos, original, {
            ...original,
            type: 'event',
            title: finalTitle,
            details,
            date: finalDate,
            time: finalTime,
            spaceId,
            priority: 'none',
            durationMinutes: Math.max(1, draft.durationMinutes),
            recurrence,
            reminderAt,
            notificationId: remind ? original.notificationId : undefined,
          });
        } else {
          const remind = Boolean(draft.remindAtTime && finalTime);
          const reminderAt =
            remind && finalTime ? localDateTime(finalDate, finalTime)?.toISOString() : undefined;
          const finalPriority = ('priority' in parsed && parsed.priority) || draft.priority;
          await updateAgendaItem(repos, original, {
            ...original,
            type: 'task',
            title: finalTitle,
            details,
            date: finalDate,
            time: finalTime,
            spaceId,
            priority: finalPriority,
            recurrence,
            reminderAt,
            notificationId: remind ? original.notificationId : undefined,
          });
        }
      } else if (draft.kind === 'routine') {
        await repos.routines.create({
          name: finalTitle,
          spaceId,
        });
      } else if (draft.kind === 'event') {
        const start = finalTime ? localDateTime(finalDate, finalTime) : parseLocalDate(finalDate);
        if (!start) throw new Error('Invalid event date');
        const duration = Math.max(1, draft.durationMinutes);
        const end = finalTime
          ? new Date(start.getTime() + duration * 60_000)
          : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
        const remind = Boolean(draft.remindAtTime);
        await createAgendaEvent(repos, {
          title: finalTitle,
          details,
          date: finalDate,
          time: finalTime,
          spaceId,
          priority: 'none',
          durationMinutes: duration,
          recurrence,
          remind,
          device: {
            title: finalTitle,
            details,
            startDate: start,
            endDate: end,
            allDay: !finalTime,
          },
        });
      } else if (draft.kind === 'note') {
        await repos.agenda.createNote({
          title: finalTitle,
          details,
          date: finalDate,
          spaceId,
          priority: 'none',
        });
      } else {
        const finalPriority = ('priority' in parsed && parsed.priority) || draft.priority;
        const remind = Boolean(draft.remindAtTime && finalTime);
        await createAgendaTask(repos, {
          title: finalTitle,
          details,
          date: finalDate,
          time: finalTime,
          spaceId,
          priority: finalPriority,
          recurrence,
          remind,
        });
      }

      requestClose({ refresh: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!original) return;
    Alert.alert('Delete item?', 'This permanently removes the item.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          void deleteAgendaItem(repos, original)
            .then(() => {
              requestClose({ refresh: true });
            })
            .catch((error) => {
              showToast(error instanceof Error ? error.message : 'Could not delete', {
                tone: 'error',
              });
            }),
      },
    ]);
  };

  const form = (
    <ItemEditorForm
      canSave={canSave}
      draft={draft}
      heading={heading}
      inputKey={inputKey}
      saving={saving}
      showDelete={mode.type === 'edit'}
      showTypePicker={showTypePicker}
      spaces={spaces}
      onChange={patch}
      onDelete={remove}
      onDismiss={() => requestClose()}
      onSave={() => void save()}
      onTitleChange={onTitleChange}
    />
  );

  // Wait until edit payload is loaded before mounting the sheet. On iOS, Expo UI
  // BottomSheet often never presents if it mounts with isPresented=false and later
  // flips to true (create worked; edit of scheduled events/tasks did not).
  if (!ready) return null;

  // No outer Host — BottomSheet already hosts itself. An absoluteFill Host was
  // painting over the planner on iOS and flashing the page background on open/close.
  return (
    <BottomSheet isPresented={presented} onDismiss={finishClose} snapPoints={['half', 'full']}>
      <RNHostView style={sheetHostStyle}>{form}</RNHostView>
    </BottomSheet>
  );
}
