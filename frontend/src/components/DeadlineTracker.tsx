import { useState } from 'react';
import type { DeadlineItem } from '../api/types';

type Props = {
  items: DeadlineItem[];
  onAddReminder: (payload: {
    applicationId: number;
    remindAt: string;
    channel: 'email' | 'sms';
  }) => Promise<void>;
};

export function DeadlineTracker({ items, onAddReminder }: Props) {
  const [reminderDateById, setReminderDateById] = useState<Record<number, string>>({});
  const [submittingById, setSubmittingById] = useState<Record<number, boolean>>({});
  const [errorById, setErrorById] = useState<Record<number, string>>({});

  const submitReminder = async (applicationId: number) => {
    const value = reminderDateById[applicationId];
    if (!value) {
      setErrorById((previous) => ({ ...previous, [applicationId]: 'Reminder date is required.' }));
      return;
    }

    const remindAt = new Date(value);
    if (Number.isNaN(remindAt.getTime()) || remindAt.getTime() <= Date.now()) {
      setErrorById((previous) => ({
        ...previous,
        [applicationId]: 'Reminder must be a valid future date/time.',
      }));
      return;
    }

    setErrorById((previous) => ({ ...previous, [applicationId]: '' }));
    setSubmittingById((previous) => ({ ...previous, [applicationId]: true }));
    try {
      await onAddReminder({
        applicationId,
        remindAt: remindAt.toISOString(),
        channel: 'email',
      });
    } catch (caught) {
      setErrorById((previous) => ({
        ...previous,
        [applicationId]: (caught as Error).message || 'Failed to add reminder.',
      }));
    } finally {
      setSubmittingById((previous) => ({ ...previous, [applicationId]: false }));
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.applicationId} className="rounded-xl border border-black/10 bg-white p-3">
          <p className="font-semibold text-ink">{item.grantTitle}</p>
          <p className="text-xs text-black/65">
            Due {new Date(item.dueDate).toLocaleDateString()} | Status: {item.status}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              className="rounded-lg border border-black/15 px-2 py-1 text-xs"
              value={reminderDateById[item.applicationId] ?? ''}
              onChange={(event) =>
                setReminderDateById((previous) => ({
                  ...previous,
                  [item.applicationId]: event.target.value,
                }))
              }
            />
            <button
              type="button"
              disabled={Boolean(submittingById[item.applicationId])}
              className="rounded-lg bg-moss px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
              onClick={() => submitReminder(item.applicationId)}
            >
              {submittingById[item.applicationId] ? 'Saving...' : 'Set reminder'}
            </button>
          </div>
          {errorById[item.applicationId] ? (
            <p className="mt-2 text-xs font-semibold text-red-700">{errorById[item.applicationId]}</p>
          ) : null}
        </div>
      ))}
      {items.length === 0 ? <p className="text-sm text-black/70">No application deadlines yet.</p> : null}
    </div>
  );
}
