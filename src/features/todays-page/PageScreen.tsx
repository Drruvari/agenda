import { useState } from 'react';

import { useToast } from '@/components/ui/ToastProvider';
import { useData } from '@/data/provider/DataContext';
import { parseLocalDate, toLocalDateString } from '@/data/schema/ids';
import { CalendarPickerModal } from '@/features/calendar/CalendarPickerModal';
import { DailyPage } from '@/features/todays-page/DailyPage';

export function PageScreen() {
  const { repos, refresh, settings, setUI, ui } = useData();
  const { showToast } = useToast();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const chooseDate = (date: Date) => {
    setUI({ selectedDate: toLocalDateString(date) });
    setCalendarOpen(false);
  };

  return (
    <>
      <DailyPage
        key={ui.selectedDate}
        date={ui.selectedDate}
        onCalendar={() => setCalendarOpen(true)}
        onError={(message) => showToast(message, { tone: 'error' })}
        onPersisted={refresh}
        repos={repos}
        settings={settings}
      />
      {calendarOpen ? (
        <CalendarPickerModal
          onChange={chooseDate}
          onClose={() => setCalendarOpen(false)}
          value={parseLocalDate(ui.selectedDate)}
          visible
        />
      ) : null}
    </>
  );
}
