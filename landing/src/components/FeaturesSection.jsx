import React from 'react';
import { ShieldCheck, MessageSquare, Bell, Terminal, GitBranch, Lock } from 'lucide-react';
import { FEATURES } from '../data/landingData';

const iconMap = {
  ShieldCheck,
  MessageSquare,
  Bell,
  Terminal,
  GitBranch,
  Lock,
};

export default function FeaturesSection() {
  return (
    <section id="features" className="border-b border-border-default py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-xl">
          <div className="text-xs font-mono font-medium uppercase tracking-wider text-accent">
            Everyday Features
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Everything you need on your phone.
          </h2>
          <p className="mt-3 text-sm text-text-secondary leading-relaxed">
            Engineered around the exact moments human intervention is required, with zero fluff.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => {
            const Icon = iconMap[f.iconName] || Terminal;
            return (
              <div
                key={f.id}
                className="group flex flex-col rounded-xl border border-border-default bg-bg-surface p-5 transition-all duration-200 hover:border-accent/40 hover:bg-bg-elevated hover:shadow-lg hover:shadow-black/20"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default bg-bg-app text-accent transition-colors group-hover:border-accent/30 group-hover:bg-accent/10">
                  <Icon className="h-4 w-4" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {f.title}
                </h3>

                <p className="mt-2 text-xs text-text-secondary leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
