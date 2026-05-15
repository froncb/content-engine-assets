"use client";
import { useState } from "react";
import type { BundleStatus } from "@/lib/schema";

const LABEL: Record<keyof BundleStatus["quality_gates"], string> = {
  reel_video: "Reel — video render",
  reel_caption: "Reel — caption",
  carousel_html: "Carousel — HTML",
  carousel_copy: "Carousel — copy",
  linkedin: "LinkedIn — post",
  twitter: "Twitter — post",
};

const COLOR: Record<"pass" | "fail" | "na", string> = {
  pass: "text-emerald-300",
  fail: "text-red-300",
  na: "text-ink-500",
};

export function QualityGateAccordion({ gates }: { gates: BundleStatus["quality_gates"] }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(gates) as Array<keyof BundleStatus["quality_gates"]>;
  const anyFail = keys.some((k) => gates[k] === "fail");

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-xs uppercase tracking-[0.18em] text-ink-400 hover:text-ink-200"
      >
        <span>
          Quality gate results{" "}
          {anyFail ? (
            <span className="text-red-300 ml-2">FAIL</span>
          ) : (
            <span className="text-emerald-300 ml-2">PASS</span>
          )}
        </span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-2 border border-ink-800 rounded-md p-4">
          {keys.map((k) => (
            <div key={k} className="flex items-center justify-between py-1 text-sm">
              <span className="text-ink-300">{LABEL[k]}</span>
              <span className={COLOR[gates[k]]}>{gates[k].toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
