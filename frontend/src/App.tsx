import { useEffect, useState } from 'react';
import { api, setAuthToken } from './api/client';
import type {
  AuthUser,
  DeadlineItem,
  DraftOption,
  DraftResponse,
  GrantMatch,
  OrgProfile,
} from './api/types';
import { AuthPanel } from './components/AuthPanel';
import { DeadlineTracker } from './components/DeadlineTracker';
import { DraftPanel } from './components/DraftPanel';
import { WorkflowProgress } from './components/WorkflowProgress';
import { GrantFeed } from './components/GrantFeed';
import { ProfileEditor } from './components/ProfileEditor';

const AUTH_TOKEN_KEY = 'grantbridge_auth_token';

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [matches, setMatches] = useState<GrantMatch[]>([]);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [draftOptions, setDraftOptions] = useState<DraftOption[]>([]);
  const [selectedDraftOptionId, setSelectedDraftOptionId] = useState<string | null>(null);
  const [pendingDraftMeta, setPendingDraftMeta] = useState<{
    grantId: number;
    sectionName: string;
  } | null>(null);
  const [draftError, setDraftError] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftConfirming, setDraftConfirming] = useState(false);
  const [draftActionKey, setDraftActionKey] = useState<string | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [message, setMessage] = useState<string>('');

  const loadAll = async () => {
    setPageLoading(true);
    setPageError('');
    try {
      const [profileResult, matchesResult, deadlinesResult] = await Promise.all([
        api.getOrgProfile(),
        api.getMatches(),
        api.getDeadlines(),
      ]);
      setProfile(profileResult);
      setMatches(matchesResult.matches);
      setDeadlines(deadlinesResult.items);
    } catch (error) {
      setPageError((error as Error).message);
    } finally {
      setPageLoading(false);
    }
  };

  const applyAuth = (token: string, authenticatedUser: AuthUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setAuthToken(token);
    setUser(authenticatedUser);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
    setProfile(null);
    setMatches([]);
    setDraftOptions([]);
    setSelectedDraftOptionId(null);
    setPendingDraftMeta(null);
    setDraft(null);
    setDeadlines([]);
    setMessage('Logged out.');
  };

  useEffect(() => {
    const boot = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setAuthToken(null);
        setAuthLoading(false);
        return;
      }

      try {
        setAuthToken(token);
        const me = await api.me();
        setUser(me.user);
        await loadAll();
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthToken(null);
      } finally {
        setAuthLoading(false);
      }
    };

    boot();
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fog px-4">
        <div className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-sm font-semibold text-ink shadow-card">
          Checking session...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-fog px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl">
          <AuthPanel
            onLogin={async (payload) => {
              const auth = await api.login(payload);
              applyAuth(auth.token, auth.user);
              await loadAll();
            }}
            onRegister={async (payload) => {
              const auth = await api.register(payload);
              applyAuth(auth.token, auth.user);
              await loadAll();
            }}
          />
          <p className="mt-3 text-center text-xs text-black/60">
            Demo seed account: demo@grantbridge.org / GrantBridge123!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fog text-ink">
      <header className="relative overflow-hidden border-b border-black/10 bg-clay px-4 py-10 sm:px-6 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(47,93,80,0.22),transparent_42%),radial-gradient(circle_at_90%_10%,rgba(247,163,92,0.28),transparent_40%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-black/60">GrantBridge</p>
              <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight sm:text-4xl md:text-5xl">
                Discover high-fit grants and draft cited proposal narratives in minutes.
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-black/70 md:text-base">
                Built for small nonprofits that need to cut proposal effort while preserving factual integrity.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <span className="rounded-full border border-black/15 bg-white/70 px-3 py-1 text-xs font-semibold">
                {user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-black/20 bg-white px-3 py-1 text-xs font-semibold text-ink"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="mt-6 max-w-sm rounded-2xl border border-black/10 bg-white/80 p-4 shadow-card">
            <WorkflowProgress
              profileComplete={profile !== null}
              matchesAvailable={matches.length > 0}
              draftConfirmed={draft !== null}
            />
          </div>
          {pageLoading ? <p className="mt-3 text-xs font-semibold text-black/70">Refreshing data...</p> : null}
          {pageError ? <p className="mt-3 text-xs font-semibold text-red-700">{pageError}</p> : null}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_1.4fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-card sm:p-5">
            <h2 className="font-display text-xl">Organization Profile Builder</h2>
            <p className="mt-1 text-sm text-black/80">
              Mission, geography, outcomes, and funder history fuel both matching and RAG context.
            </p>
            <div className="mt-4">
              <ProfileEditor
                initial={profile}
                onSave={async (value) => {
                  await api.updateOrgProfile(value);
                  setMessage('Profile updated.');
                  await loadAll();
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-card sm:p-5">
            <h2 className="font-display text-xl">Deadline Tracker</h2>
            <p className="mt-1 text-sm text-black/80">Set reminders for active grant applications.</p>
            <div className="mt-4">
              <DeadlineTracker
                items={deadlines}
                onAddReminder={async (payload) => {
                  await api.addReminder(payload);
                  setMessage('Reminder added.');
                  await loadAll();
                }}
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="font-display text-2xl">Matched Grant Feed</h2>
            <p className="mt-1 text-sm text-black/80">
              Opportunity scoring based on mission area, geography, and budget fit.
            </p>
            <div className="mt-4">
              <GrantFeed
                matches={matches}
                loadingKey={draftActionKey}
                onGenerate={async (grantId, sectionName) => {
                  const key = `${grantId}:${sectionName}`;
                  setDraftActionKey(key);
                  setDraftLoading(true);
                  setDraftError('');
                  setDraft(null);
                  setDraftOptions([]);
                  setSelectedDraftOptionId(null);
                  setPendingDraftMeta({ grantId, sectionName });
                  try {
                    const result = await api.generateDraft({ grantId, sectionName });
                    setDraftOptions(result.options);
                    setSelectedDraftOptionId(result.options[0]?.optionId ?? null);
                    setMessage(`Draft options generated for ${sectionName.replaceAll('_', ' ')}.`);
                  } catch (error) {
                    setDraftError((error as Error).message || 'Failed to generate draft.');
                  } finally {
                    setDraftLoading(false);
                    setDraftActionKey(null);
                  }
                }}
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-moss/30 bg-gradient-to-br from-moss/20 via-white to-apricot/25 p-4 shadow-card sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-moss/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-apricot/25 blur-2xl" />
            <div className="pointer-events-none absolute left-1/3 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-cyan-300/20 blur-2xl" />
            <div className="relative">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-moss to-cyan-600 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Priority Feature
              </span>
              <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">AI Draft with Citations</h2>
              <p className="mt-1 h-1 w-36 rounded-full bg-gradient-to-r from-moss via-cyan-600 to-apricot" />
              <p className="mt-3 max-w-2xl text-sm font-medium text-black/85">
                Every generated sentence is grounded to your organization source material, making this
                the most critical trust layer in GrantBridge.
              </p>
              <div className="mt-5">
                <DraftPanel
                  draft={draft}
                  options={draftOptions}
                  selectedOptionId={selectedDraftOptionId}
                  onSelectOption={setSelectedDraftOptionId}
                  onConfirm={async () => {
                    const selected = draftOptions.find((item) => item.optionId === selectedDraftOptionId);
                    if (!selected || !pendingDraftMeta) {
                      setDraftError('Select a draft option first.');
                      return;
                    }

                    setDraftConfirming(true);
                    setDraftError('');
                    try {
                      const confirmed = await api.confirmDraft({
                        grantId: pendingDraftMeta.grantId,
                        sectionName: pendingDraftMeta.sectionName,
                        content: selected.content,
                        confidence: selected.confidence,
                        citations: selected.citations,
                      });
                      setDraft(confirmed);
                      setDraftOptions([]);
                      setSelectedDraftOptionId(null);
                      setPendingDraftMeta(null);
                      setMessage('Draft confirmed and saved.');
                      await loadAll();
                    } catch (error) {
                      setDraftError((error as Error).message || 'Failed to confirm draft.');
                    } finally {
                      setDraftConfirming(false);
                    }
                  }}
                  confirming={draftConfirming}
                  loading={draftLoading}
                  error={draftError}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-black/55 sm:px-6">
        {message || 'Ready. Connect OpenAI key for live grounded generation.'}
      </footer>
    </div>
  );
}

export default App;
