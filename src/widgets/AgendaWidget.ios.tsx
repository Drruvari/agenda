import { Circle, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  strikethrough,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type React from 'react';

import type { WidgetRow, WidgetSnapshot } from './types';

const EMPTY: WidgetSnapshot = {
  schemaVersion: 1,
  generation: 0,
  date: '',
  generatedAt: '',
  remainingCount: 0,
  rows: [],
  sources: {
    agenda: 'unavailable',
    calendar: 'unavailable',
    birthdays: 'unavailable',
    reminders: 'unavailable',
  },
};

/**
 * IMPORTANT: expo-widgets stringifies only this function for the extension JS runtime.
 * Keep all helpers inline — outer-scope references are not available there.
 */
function AgendaWidgetView(snapshot: WidgetSnapshot, environment: WidgetEnvironment) {
  'widget';
  const accent = '#655F91';
  const text = '#191917';
  const muted = '#6D6D68';
  const border = '#D2C9BC';
  const card = '#FBFAF7';
  const danger = '#C0392B';
  const isCompact =
    environment.widgetFamily === 'systemSmall' || environment.widgetFamily === 'systemMedium';

  const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
  const allDay = rows.filter((row) => row.section === 'allDay');
  const scheduled = rows.filter((row) => row.section === 'scheduled');
  const hasBothSections = allDay.length > 0 && scheduled.length > 0;
  const maxRows = isCompact ? 3 : environment.widgetFamily === 'systemLarge' ? 6 : 8;

  let allDayLimit = Math.min(
    allDay.length,
    hasBothSections && isCompact ? 1 : Math.max(1, Math.ceil(maxRows / 2)),
  );
  let scheduledLimit = Math.min(scheduled.length, maxRows - allDayLimit);
  if (allDay.length === 0) {
    allDayLimit = 0;
    scheduledLimit = Math.min(scheduled.length, maxRows);
  } else if (scheduled.length === 0) {
    scheduledLimit = 0;
    allDayLimit = Math.min(allDay.length, maxRows);
  } else if (allDayLimit + scheduledLimit < maxRows) {
    const leftover = maxRows - allDayLimit - scheduledLimit;
    if (isCompact && scheduled.length > scheduledLimit) {
      scheduledLimit = Math.min(scheduled.length, scheduledLimit + leftover);
    } else if (allDay.length > allDayLimit) {
      allDayLimit = Math.min(allDay.length, allDayLimit + leftover);
    } else if (scheduled.length > scheduledLimit) {
      scheduledLimit = Math.min(scheduled.length, scheduledLimit + leftover);
    }
  }

  const visibleAllDay = allDay.slice(0, allDayLimit);
  const visibleScheduled = scheduled.slice(0, scheduledLimit);
  const shown = visibleAllDay.length + visibleScheduled.length;
  const hidden = Math.max(0, rows.length - shown);

  const displayDate = isCompact
    ? 'Today'
    : snapshot.date
      ? new Date(`${snapshot.date}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : 'Agenda';

  const children: React.ReactElement[] = [];

  children.push(
    <HStack key="header" spacing={8} alignment="center">
      <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle(text)]}>
        {displayDate}
      </Text>
      <Spacer />
      <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle(accent)]}>
        {String(snapshot.remainingCount ?? 0)}
      </Text>
    </HStack>,
  );

  if (rows.length === 0) {
    children.push(
      <Text key="empty" modifiers={[font({ size: 15 }), foregroundStyle(muted)]}>
        Nothing left today
      </Text>,
    );
  }

  const pushSection = (title: string, sectionRows: WidgetRow[], keyPrefix: string) => {
    if (sectionRows.length === 0) return;
    children.push(
      <Text
        key={`${keyPrefix}-label`}
        modifiers={[
          font({ size: isCompact ? 12 : 13, weight: 'semibold' }),
          foregroundStyle(muted),
        ]}
      >
        {title}
      </Text>,
    );

    for (const row of sectionRows) {
      const checkable = row.checkable !== false && row.source === 'agenda';
      const titleColor = row.completed ? muted : text;
      const ring = row.completed ? accent : border;
      const timeColor = row.late && !row.completed ? danger : muted;

      const leading = checkable ? (
        <ZStack>
          <Circle
            modifiers={[
              frame({ width: isCompact ? 22 : 30, height: isCompact ? 22 : 30 }),
              foregroundStyle(card),
              strokeBorder({ color: ring, style: { lineWidth: 2 }, shape: 'circle' }),
            ]}
          />
          {row.completed ? (
            <Circle
              modifiers={[
                frame({ width: isCompact ? 16 : 22, height: isCompact ? 16 : 22 }),
                foregroundStyle(accent),
              ]}
            />
          ) : null}
        </ZStack>
      ) : (
        <Image
          systemName={row.source === 'reminder' ? 'checklist' : 'clock'}
          size={24}
          color={row.late && !row.completed ? danger : muted}
        />
      );

      const titleNode = row.completed ? (
        <Text
          modifiers={[
            font({ size: isCompact ? 14 : 15, weight: 'medium' }),
            foregroundStyle(titleColor),
            lineLimit(1),
            strikethrough({ isActive: true, pattern: 'solid' }),
          ]}
        >
          {row.title}
        </Text>
      ) : (
        <Text
          modifiers={[
            font({ size: isCompact ? 14 : 15, weight: 'medium' }),
            foregroundStyle(titleColor),
            lineLimit(1),
          ]}
        >
          {row.title}
        </Text>
      );

      const body =
        row.section === 'scheduled' && row.time ? (
          <HStack key={row.id} spacing={isCompact ? 7 : 10} alignment="center">
            {leading}
            <Text
              modifiers={[
                font({ size: isCompact ? 12 : 13, weight: 'semibold' }),
                foregroundStyle(timeColor),
              ]}
            >
              {row.time}
            </Text>
            {titleNode}
            <Spacer />
          </HStack>
        ) : (
          <HStack key={row.id} spacing={isCompact ? 7 : 10} alignment="center">
            {leading}
            {titleNode}
            <Spacer />
          </HStack>
        );

      children.push(body);
    }
  };

  pushSection('All day', visibleAllDay, 'allday');
  pushSection('Scheduled', visibleScheduled, 'scheduled');

  if (hidden > 0 && !isCompact) {
    children.push(
      <Text key="more" modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(muted)]}>
        {`+${hidden} more`}
      </Text>,
    );
  }

  children.push(<Spacer key="tail" />);

  return (
    <VStack
      spacing={isCompact ? 3 : 8}
      alignment="leading"
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        padding({
          top: isCompact ? 3 : 8,
          leading: isCompact ? 8 : 10,
          bottom: isCompact ? 3 : 8,
          trailing: isCompact ? 8 : 10,
        }),
      ]}
    >
      {children}
    </VStack>
  );
}

export const AgendaWidget = createWidget('AgendaWidget', AgendaWidgetView);
export const EMPTY_WIDGET_SNAPSHOT = EMPTY;
