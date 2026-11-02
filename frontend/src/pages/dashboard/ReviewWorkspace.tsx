import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, GitPullRequest, Info, LoaderCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";

type Props = { api: string; repository: string };
type Finding = { id: number; severity: string; text: string };

function parseFindings(review: string): Finding[] {
  if (/^(?:no actionable findings|no findings|nothing to report)[.!\s]*$/i.test(review.trim())) return [];
  const severityLine = /^\s*(?:[-*]\s*)?(?:\*\*)?(?:\[)?(P[0-3])(?:\])?(?:\*\*)?\s*[:-]\s*(.*)$/i;
  const findings: Finding[] = [];
  let current: Finding | null = null;
  for (const line of review.split(/\r?\n/)) {
    const match = line.match(severityLine);
    if (match) {
      if (current) findings.push(current);
      current = { id: findings.length, severity: match[1].toLowerCase(), text: match[2].trim() };
    } else if (current) {
      current.text += `${current.text ? "\n" : ""}${line.trimEnd()}`;
    }
  }
  if (current) findings.push(current);
  return findings;
}

function severityIcon(severity: string) {
  if (["p0", "p1", "critical", "high"].includes(severity)) return <AlertTriangle size={15} />;
  if (["p2", "medium", "warning"].includes(severity)) return <Info size={15} />;
  if (["p3", "low"].includes(severity)) return <CheckCircle2 size={15} />;
  return <Sparkles size={15} />;
}

export default function ReviewWorkspace({ api, repository }: Props) {
  const [number, setNumber] = useState("");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const findings = useMemo(() => review ? parseFindings(review) : [], [review]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [owner, repo] = repository.split("/");
    const pullNumber = Number(number);
    if (!owner || !repo || !Number.isInteger(pullNumber) || pullNumber < 1) {
      setError("Choose a repository and enter a valid pull request number.");
      return;
    }
    setLoading(true); setError(""); setReview("");
    try {
      await fetch(`${api}/api/v1/auth/csrf`, { credentials: "include" });
      const rawToken = document.cookie.split("; ").find((value) => value.startsWith("XSRF-TOKEN="))?.split("=").slice(1).join("=");
      const response = await fetch(`${api}/api/v1/github/pull-requests/review`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(rawToken ? { "X-XSRF-TOKEN": decodeURIComponent(rawToken) } : {}) },
        body: JSON.stringify({ owner, repository: repo, pullNumber }),
      });
      const data = await response.json() as { review?: string; detail?: string; message?: string };
      if (!response.ok) throw new Error(data.detail || data.message || "The review could not be completed.");
      setReview(data.review || "The AI review returned no findings.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be completed.");
    } finally { setLoading(false); }
  }

  return (
    <motion.section className="review-workspace" id="pull-requests" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34 }}>
      <div className="workspace-panel-heading">
        <div className="panel-icon"><Sparkles size={17} /></div>
        <div><span className="dashboard-kicker">GROQ-POWERED ANALYSIS</span><h2>Pull request review</h2><p>Review a change with context from your GitHub repository.</p></div>
        <span className="review-repo-tag">{repository || "Select a repository"}</span>
      </div>
      <form onSubmit={submit} className="review-form">
        <label htmlFor="pull-number">Pull request number</label>
        <div className="review-form-row">
          <div className="review-input-wrap"><GitPullRequest size={15} /><input id="pull-number" type="number" min="1" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="e.g. 42" required /></div>
          <button className="button button-primary" type="submit" disabled={loading || !repository}>
            {loading ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}{loading ? "Reviewing diff..." : "Review pull request"}
          </button>
        </div>
      </form>
      {error && <div className="error-card" role="alert">{error}</div>}
      {loading && <div className="review-loading" aria-live="polite"><span className="review-loading-orbit"><Sparkles size={17} /></span><div><strong>Reading the pull request diff</strong><p>Findings will appear here when the review completes.</p></div></div>}
      {review && !loading && <motion.div className="review-result-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="review-result-heading"><div><span className="dashboard-kicker">REVIEW RESULT</span><h3>Findings from pull request #{number}</h3></div><span className="finding-count">{findings.length} {findings.length === 1 ? "item" : "items"}</span></div>
        {findings.length ? <div className="finding-list">{findings.map((finding) => <article className={`finding-item severity-${finding.severity}`} key={finding.id}><span className="finding-severity-icon">{severityIcon(finding.severity)}</span><span className="finding-severity-label">{finding.severity}</span><p>{finding.text}</p></article>)}</div> : <p className="review-raw-result">{review}</p>}
        {findings.length > 0 && <details className="review-original"><summary>View complete model response</summary><pre>{review}</pre></details>}
      </motion.div>}
    </motion.section>
  );
}
