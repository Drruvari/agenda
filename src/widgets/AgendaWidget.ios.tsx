import { Button, Circle, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
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

  const maxRows =
    environment.widgetFamily === 'systemSmall'
      ? 3
      : environment.widgetFamily === 'systemMedium'
        ? 5
        : environment.widgetFamily === 'systemLarge'
          ? 9
          : 12;

  const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
  const allDay = rows.filter((row) => row.section === 'allDay');
  const scheduled = rows.filter((row) => row.section === 'scheduled');

  let allDayLimit = Math.min(allDay.length, Math.max(1, Math.ceil(maxRows / 2)));
  let scheduledLimit = Math.min(scheduled.length, maxRows - allDayLimit);
  if (allDay.length === 0) {
    allDayLimit = 0;
    scheduledLimit = Math.min(scheduled.length, maxRows);
  } else if (scheduled.length === 0) {
    scheduledLimit = 0;
    allDayLimit = Math.min(allDay.length, maxRows);
  } else if (allDayLimit + scheduledLimit < maxRows) {
    const leftover = maxRows - allDayLimit - scheduledLimit;
    if (allDay.length > allDayLimit) {
      allDayLimit = Math.min(allDay.length, allDayLimit + leftover);
    } else if (scheduled.length > scheduledLimit) {
      scheduledLimit = Math.min(scheduled.length, scheduledLimit + leftover);
    }
  }

  const visibleAllDay = allDay.slice(0, allDayLimit);
  const visibleScheduled = scheduled.slice(0, scheduledLimit);
  const shown = visibleAllDay.length + visibleScheduled.length;
  const hidden = Math.max(0, rows.length - shown);

  const displayDate = snapshot.date
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
        modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(muted)]}
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
              frame({ width: 30, height: 30 }),
              foregroundStyle(card),
              strokeBorder({ color: ring, style: { lineWidth: 2 }, shape: 'circle' }),
            ]}
          />
          {row.completed ? (
            <Circle modifiers={[frame({ width: 22, height: 22 }), foregroundStyle(accent)]} />
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
            font({ size: 15, weight: 'medium' }),
            foregroundStyle(titleColor),
            lineLimit(1),
            strikethrough({ isActive: true, pattern: 'solid' }),
          ]}
        >
          {row.title}
        </Text>
      ) : (
        <Text
          modifiers={[font({ size: 15, weight: 'medium' }), foregroundStyle(titleColor), lineLimit(1)]}
        >
          {row.title}
        </Text>
      );

      const body =
        row.section === 'scheduled' && row.time ? (
          <HStack spacing={10} alignment="center">
            {leading}
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(timeColor)]}>
              {row.time}
            </Text>
            {titleNode}
            <Spacer />
          </HStack>
        ) : (
          <HStack spacing={10} alignment="center">
            {leading}
            {titleNode}
            <Spacer />
          </HStack>
        );

      if (!checkable) {
        if (row.section === 'scheduled' && row.time) {
          children.push(
            <HStack key={row.id} spacing={10} alignment="center">
              {leading}
              <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(timeColor)]}>
                {row.time}
              </Text>
              {titleNode}
              <Spacer />
            </HStack>,
          );
        } else {
          children.push(
            <HStack key={row.id} spacing={10} alignment="center">
              {leading}
              {titleNode}
              <Spacer />
            </HStack>,
          );
        }
        continue;
      }

      children.push(
        <Button
          key={row.id}
          target={`toggle:${row.id}`}
          modifiers={[buttonStyle('plain')]}
          onPress={
            (() => {
              const nextRows = rows.map((item) =>
                item.id === row.id
                  ? { ...item, completed: !item.completed, late: item.completed ? item.late : false }
                  : item,
              );
              return {
                ...snapshot,
                rows: nextRows,
                remainingCount: nextRows.filter((item) => !item.completed).length,
              };
            }) as () => void
          }
        >
          {body}
        </Button>,
      );
    }
  };

  pushSection('All day', visibleAllDay, 'allday');
  pushSection('Scheduled', visibleScheduled, 'scheduled');

  if (hidden > 0) {
    children.push(
      <Text key="more" modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(muted)]}>
        {`+${hidden} more`}
      </Text>,
    );
  }

  children.push(<Spacer key="tail" />);

  return (
    <VStack
      spacing={8}
      alignment="leading"
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        padding({ top: 8, leading: 10, bottom: 8, trailing: 10 }),
      ]}
    >
      {children}
    </VStack>
  );
}

export const AgendaWidget = createWidget('AgendaWidget', AgendaWidgetView);
export const EMPTY_WIDGET_SNAPSHOT = EMPTY;
