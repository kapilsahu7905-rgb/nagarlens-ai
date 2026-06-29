import type { CommunityIssue, Language } from "../types";
import { useText } from "../i18n";

export function Stats({ issues, language }: { issues: CommunityIssue[]; language: Language }) {
  const t = useText(language);
  const confirmations = issues.reduce((sum, issue) => sum + issue.confirmations, 0);
  const resolved = issues.filter((issue) => issue.status === "Resolved").length;
  return (
    <section className="stats-grid" aria-label="Community impact statistics">
      <article className="stat-card"><span>📍</span><div><strong>{issues.length}</strong><small>{t.reported}</small></div></article>
      <article className="stat-card"><span>🤝</span><div><strong>{confirmations}</strong><small>{t.verified}</small></div></article>
      <article className="stat-card"><span>✅</span><div><strong>{resolved}</strong><small>{t.resolved}</small></div></article>
    </section>
  );
}
