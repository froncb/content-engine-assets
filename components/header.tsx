import Link from "next/link";

export function Header({
  company,
  crumb,
}: {
  company?: string;
  crumb?: { label: string; href?: string }[];
}) {
  return (
    <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3 text-sm">
        <Link
          href="/companies"
          className="text-ink-50 font-semibold tracking-tight hover:text-accent transition-colors"
        >
          PHNTM Asset Hub
        </Link>
        {company ? (
          <>
            <span className="text-ink-500">/</span>
            <Link
              href={`/c/${company}`}
              className="text-ink-200 hover:text-ink-50 transition-colors"
            >
              {company}
            </Link>
          </>
        ) : null}
        {crumb?.map((c, i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="text-ink-500">/</span>
            {c.href ? (
              <Link href={c.href} className="text-ink-200 hover:text-ink-50 transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className="text-ink-50">{c.label}</span>
            )}
          </span>
        ))}
        <span className="ml-auto text-xs text-ink-500 hidden sm:block">
          v1 · filmed-footage workflow
        </span>
      </div>
    </header>
  );
}
