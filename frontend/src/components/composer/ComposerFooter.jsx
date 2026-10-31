import React from 'react';
import { Icon } from '../../constants/icons';

export function ComposerFooter() {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-1.5 text-[10px] font-mono text-[#747C87] select-none">
      <span>© {new Date().getFullYear()}</span>
      <span className="text-[#A0A6AF] font-medium">Koushik Kar</span>
      <span className="text-[#30343A]">·</span>
      <a
        href="https://github.com/KoushikGit2024/AgentWatch"
        target="_blank"
        rel="noopener noreferrer"
        title="View AgentWatch on GitHub"
        className="inline-flex items-center gap-1 text-[#747C87] hover:text-[#7C9FC5] transition-colors focus:outline-none"
      >
        <div className="w-3 h-3">{Icon.github}</div>
        <span>AgentWatch</span>
      </a>
    </div>
  );
}

