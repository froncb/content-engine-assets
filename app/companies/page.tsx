import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

function getCompanies(): string[] {
  const raw = process.env.COMPANIES || "promptperfect";
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

export default function CompaniesPage() {
  const companies = getCompanies();
  return (
    <main className="min-h-screen bg-ink-900 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
          PHNTM Asset Hub
        </p>
        <h1 className="text-3xl text-ink-50 font-semibold tracking-tight mb-10">
          Choose a company
        </h1>
        <ul className="space-y-2">
          {companies.map((c) => (
            <li key={c}>
              <Link
                href={`/c/${c}`}
                className="group flex items-center justify-between rounded-md border border-ink-700 bg-ink-800 px-5 py-4 hover:border-accent/40 hover:bg-ink-700 transition-colors"
              >
                <span className="text-ink-50 font-medium">{c}</span>
                <ArrowUpRight
                  size={18}
                  className="text-ink-400 group-hover:text-accent transition-colors"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
