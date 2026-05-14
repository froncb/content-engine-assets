"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function FilmingScriptViewer({ script }: { script: string }) {
  const [copied, setCopied] = useState(false);
  const wordCount = script.split(/\s+/).filter(Boolean).length;
  const estSeconds = Math.round(wordCount / 2.7);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers / insecure context — fall through silently.
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-400">
          suggested filming script
        </p>
        <div className="flex items-center gap-3 text-xs text-ink-500">
          <span>
            {wordCount} words · ~{estSeconds}s
          </span>
          <button
            type="button"
            onClick={copyToClipboard}
            className="inline-flex items-center gap-1.5 rounded bg-ink-800 hover:bg-ink-700 text-ink-200 px-2.5 py-1 transition-colors"
          >
            {copied ? (
              <>
                <Check size={11} />
                copied
              </>
            ) : (
              <>
                <Copy size={11} />
                copy
              </>
            )}
          </button>
        </div>
      </div>
      <div className="rounded-md border border-ink-800 bg-ink-900 px-5 py-4">
        <p className="text-ink-100 leading-relaxed whitespace-pre-wrap font-serif text-[15px]">
          {script}
        </p>
      </div>
      <p className="text-xs text-ink-500 mt-3 leading-relaxed">
        Feel free to go off-script within the topic. Your reel will adapt to whatever you
        actually film. The carousel, LinkedIn post, and tweet stay on the planned topic.
      </p>
    </div>
  );
}
