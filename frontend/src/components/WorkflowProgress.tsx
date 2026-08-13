type Props = {
  profileComplete: boolean;
  matchesAvailable: boolean;
  draftConfirmed: boolean;
};

export function WorkflowProgress({ profileComplete, matchesAvailable, draftConfirmed }: Props) {
  const steps = [
    { label: 'Profile', complete: profileComplete },
    { label: 'Matches', complete: matchesAvailable },
    { label: 'Draft', complete: draftConfirmed },
  ];

  const completedCount = steps.filter((s) => s.complete).length;
  const percentage = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-black/70">Workflow completion</span>
        <span className="text-sm font-bold text-moss">{percentage}%</span>
      </div>

      <div className="h-2 rounded-full bg-black/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-moss to-cyan-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold transition ${
              step.complete
                ? 'bg-moss/15 text-moss'
                : 'bg-black/5 text-black/50'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step.complete
                  ? 'bg-moss text-white'
                  : 'border border-black/20 bg-white'
              }`}
            >
              {step.complete ? '✓' : ''}
            </div>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
