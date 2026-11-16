import { useState } from 'react';
import { Check } from 'lucide-react';
import { SAMPLE_QUESTION } from '../../data/simulatorData';

export default function QuestionView() {
  const [choice, setChoice] = useState(SAMPLE_QUESTION.options[0].id);
  const [custom, setCustom] = useState('');
  const [sent, setSent] = useState(null);

  const answer = custom.trim() || SAMPLE_QUESTION.options.find(o => o.id === choice)?.title;

  if (sent) {
    return (
      <div className="enter space-y-3 text-sm">
        <div className="flex items-start gap-2.5 rounded-md border border-accent/40 bg-accent/10 p-3 text-accent">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Answer sent</p>
            <p className="mt-1 font-mono text-xs text-text-secondary">“{sent}”</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="font-mono text-xs text-accent underline-offset-4 hover:underline"
        >
          Reset sample
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-status-purple font-medium">
          Agent asks
        </p>
        <p className="mt-2 font-medium leading-snug">{SAMPLE_QUESTION.prompt}</p>
      </div>

      <div role="radiogroup" aria-label="Answer options" className="space-y-2">
        {SAMPLE_QUESTION.options.map(o => {
          const on = !custom.trim() && choice === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setChoice(o.id);
                setCustom('');
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                on
                  ? 'border-accent bg-accent/10'
                  : 'border-border-default bg-bg-surface hover:border-border-strong'
              }`}
            >
              <span>
                <span className="block text-[13px] font-medium">{o.title}</span>
                <span className="block text-xs text-text-muted">{o.sub}</span>
              </span>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-accent' : 'border-border-strong'}`}
              >
                <span
                  className={`h-2 w-2 rounded-full bg-accent transition-transform duration-150 ${on ? 'scale-100' : 'scale-0'}`}
                />
              </span>
            </button>
          );
        })}
      </div>

      <label className="block">
        <span className="sr-only">Type a different answer</span>
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="Or type your own answer"
          className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2.5 font-mono text-xs placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={() => setSent(answer)}
        className="btn btn--primary !min-h-11 w-full !text-sm"
      >
        Send answer
      </button>
    </div>
  );
}
