import type { GrantMatch } from '../api/types';

type Props = {
  matches: GrantMatch[];
  onGenerate: (grantId: number, sectionName: string) => Promise<void>;
  loadingKey: string | null;
};

export function GrantFeed({ matches, onGenerate, loadingKey }: Props) {
  return (
    <div className="space-y-4">
      {matches.map((grant, index) => (
        <article
          key={grant.id}
          className="animate-rise rounded-2xl border border-black/10 bg-white p-4 shadow-card"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl text-ink">{grant.title}</h3>
            <span className="rounded-full bg-moss px-3 py-1 text-xs font-semibold text-white">
              Score {grant.score}
            </span>
          </div>
          <p className="mt-2 text-sm text-black/80">{grant.summary}</p>
          <p className="mt-1 text-xs text-black/60">
            Source: {grant.source} | Deadline: {new Date(grant.deadline).toLocaleDateString()}
          </p>
          <ul className="mt-3 list-disc pl-5 text-xs text-black/75">
            {grant.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {['need_statement', 'program_design', 'outcomes_and_evaluation', 'sustainability'].map(
              (section) => {
                const actionKey = `${grant.id}:${section}`;
                const isLoading = loadingKey === actionKey;
                return (
                <button
                  key={section}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onGenerate(grant.id, section)}
                  className="w-full rounded-lg bg-apricot/20 px-3 py-1 text-xs font-semibold text-ink hover:bg-apricot/30 disabled:opacity-60 sm:w-auto"
                >
                  {isLoading ? 'Generating...' : `Draft ${section.replaceAll('_', ' ')}`}
                </button>
                );
              },
            )}
            {grant.url ? (
              <a
                href={grant.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-black/20 px-3 py-1 text-xs font-semibold text-ink"
              >
                Open listing
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
