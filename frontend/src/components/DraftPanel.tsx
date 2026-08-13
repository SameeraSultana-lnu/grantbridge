import type { DraftOption, DraftResponse } from '../api/types';

function downloadDraft(draft: DraftResponse) {
  const markdown = `# Draft: ${draft.sectionName.replaceAll('_', ' ')}

**Confidence:** ${draft.confidence}%

## Content

${draft.content}

## Citations

${draft.citations.map((c, i) => `${i + 1}. [${c.documentId}] ${c.title}`).join('\n')}
`;

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  // Sanitize filename to prevent path traversal: allow only alphanumerics, hyphens, underscores
  const safeName = draft.sectionName.replace(/[^a-z0-9_-]/gi, '_');
  link.download = `draft-${safeName}-${new Date().getTime()}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type Props = {
  draft: DraftResponse | null;
  options: DraftOption[];
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  onConfirm: () => Promise<void>;
  confirming: boolean;
  loading: boolean;
  error: string;
};

export function DraftPanel({
  draft,
  options,
  selectedOptionId,
  onSelectOption,
  onConfirm,
  confirming,
  loading,
  error,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-moss/35 bg-white p-5 text-sm font-semibold text-moss shadow-card">
        Generating grounded draft...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
        {error}
      </div>
    );
  }

  if (!draft) {
    if (options.length > 0) {
      const selected = options.find((item) => item.optionId === selectedOptionId) ?? options[0];
      return (
        <div className="rounded-2xl border border-moss/25 bg-white p-5 shadow-card ring-1 ring-moss/15">
          <h3 className="font-display text-lg text-ink">Select Draft Option Before Confirming</h3>
          <p className="mt-2 text-sm text-black/80">
            Compare options by match confidence and choose one to confirm.
          </p>
          <div className="mt-4 grid gap-3">
            {options.map((option) => {
              const selectedState = selected.optionId === option.optionId;
              return (
                <button
                  key={option.optionId}
                  type="button"
                  onClick={() => onSelectOption(option.optionId)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedState
                      ? 'border-moss bg-moss/10 ring-1 ring-moss/30'
                      : 'border-black/15 bg-white hover:border-moss/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{option.label}</p>
                    <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-800">
                      Match {option.confidence}%
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs text-black/80">{option.content}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-black/10 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/70">Selected preview</p>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-black/85">{selected.content}</pre>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-black/70">Chosen match confidence: {selected.confidence}%</p>
            <button
              type="button"
              disabled={confirming}
              onClick={() => {
                void onConfirm();
              }}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {confirming ? 'Confirming...' : 'Confirm selected draft'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-dashed border-black/30 bg-white/70 p-5 text-sm text-black/85">
        Select a grant and section to generate a grounded narrative draft.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-moss/25 bg-white p-5 shadow-card ring-1 ring-moss/15">
      <h3 className="font-display text-lg text-ink">
        Draft: {draft.sectionName.replaceAll('_', ' ')}
      </h3>
      <p className="mt-1 text-xs font-semibold text-cyan-800">Confirmed match confidence: {draft.confidence}%</p>
      <pre className="mt-3 whitespace-pre-wrap text-sm text-black/85">{draft.content}</pre>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-black/80">Citations</p>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs text-black/85">
          {draft.citations.map((citation) => (
            <li
              key={`${citation.documentId}-${citation.title}`}
              className="rounded-full border border-moss/20 bg-gradient-to-r from-moss/10 to-cyan-100 px-3 py-1"
            >
              [{citation.documentId.slice(0, 8)}] {citation.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadDraft(draft)}
          className="rounded-lg border border-moss/40 bg-moss/10 px-3 py-2 text-xs font-semibold text-moss transition hover:bg-moss/20"
        >
          ⬇ Download markdown
        </button>
      </div>
    </div>
  );
}
