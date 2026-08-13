import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { OrgProfile } from '../api/types';

type Props = {
  initial: OrgProfile | null;
  onSave: (value: Omit<OrgProfile, 'id'>) => Promise<void>;
};

function splitCsv(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

const profileSchema = z.object({
  legalName: z.string().trim().min(2, 'Legal name must be at least 2 characters.'),
  mission: z.string().trim().min(20, 'Mission must be at least 20 characters.'),
  geography: z.array(z.string()).default([]),
  focusAreas: z.array(z.string()).default([]),
  annualBudget: z.number().nonnegative('Annual budget must be 0 or greater.'),
  pastFunders: z.array(z.string()).default([]),
});

export function ProfileEditor({ initial, onSave }: Props) {
  const [legalName, setLegalName] = useState(initial?.legalName ?? '');
  const [mission, setMission] = useState(initial?.mission ?? '');
  const [geography, setGeography] = useState((initial?.geography ?? []).join(', '));
  const [focusAreas, setFocusAreas] = useState((initial?.focusAreas ?? []).join(', '));
  const [annualBudget, setAnnualBudget] = useState(String(initial?.annualBudget ?? 0));
  const [pastFunders, setPastFunders] = useState((initial?.pastFunders ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLegalName(initial?.legalName ?? '');
    setMission(initial?.mission ?? '');
    setGeography((initial?.geography ?? []).join(', '));
    setFocusAreas((initial?.focusAreas ?? []).join(', '));
    setAnnualBudget(String(initial?.annualBudget ?? 0));
    setPastFunders((initial?.pastFunders ?? []).join(', '));
  }, [initial]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = profileSchema.parse({
        legalName,
        mission,
        geography: splitCsv(geography),
        focusAreas: splitCsv(focusAreas),
        annualBudget: Number(annualBudget),
        pastFunders: splitCsv(pastFunders),
      });
      await onSave(payload);
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError(caught.issues[0]?.message ?? 'Validation failed.');
      } else {
        setError((caught as Error).message || 'Failed to save profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <input
        className="rounded-xl border border-black/10 bg-white px-3 py-2"
        value={legalName}
        onChange={(event) => setLegalName(event.target.value)}
        placeholder="Legal organization name"
        maxLength={200}
        required
      />
      <textarea
        className="min-h-28 rounded-xl border border-black/10 bg-white px-3 py-2"
        value={mission}
        onChange={(event) => setMission(event.target.value)}
        placeholder="Mission statement"
        maxLength={2000}
        required
      />
      <input
        className="rounded-xl border border-black/10 bg-white px-3 py-2"
        value={geography}
        onChange={(event) => setGeography(event.target.value)}
        placeholder="Geography (comma-separated)"
        maxLength={500}
      />
      <input
        className="rounded-xl border border-black/10 bg-white px-3 py-2"
        value={focusAreas}
        onChange={(event) => setFocusAreas(event.target.value)}
        placeholder="Focus areas (comma-separated)"
        maxLength={500}
      />
      <input
        className="rounded-xl border border-black/10 bg-white px-3 py-2"
        type="number"
        min={0}
        value={annualBudget}
        onChange={(event) => setAnnualBudget(event.target.value)}
        placeholder="Annual budget"
      />
      <input
        className="rounded-xl border border-black/10 bg-white px-3 py-2"
        value={pastFunders}
        onChange={(event) => setPastFunders(event.target.value)}
        placeholder="Past funders (comma-separated)"
      />
      <button
        disabled={saving}
        type="submit"
        className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-zinc-800 hover:text-white disabled:opacity-60"
      >
        {saving ? 'Saving profile...' : 'Save profile'}
      </button>
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}
