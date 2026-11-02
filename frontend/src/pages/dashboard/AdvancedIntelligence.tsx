import { useState, type FormEvent } from "react";
import { Activity, BookOpenCheck, GitCommitHorizontal, GitPullRequest, LoaderCircle, Sparkles, Tags } from "lucide-react";
import { motion } from "motion/react";
import { apiUrl, responseError } from "../../lib/api";

type Source = { sha?: string; message?: string; at?: string | null; url?: string | null };
type Report = { repository?: string; githubSnapshot?: { repository: string }; report?: string; assessment?: string; changedFileCount?: number; additions?: number; deletions?: number; sources?: Source[] };
type Props = { repository: string };

export default function AdvancedIntelligence({ repository }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [base, setBase] = useState("");
  const [head, setHead] = useState("");
  const [pull, setPull] = useState("");

  async function request(kind: string, path: string) {
    setLoading(kind); setError(""); setReport(null);
    try {
      const response = await fetch(apiUrl(path), { credentials: "include" });
      if (!response.ok) throw new Error(await responseError(response, "Developer intelligence could not be generated."));
      setReport(await response.json() as Report);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Developer intelligence could not be generated."); }
    finally { setLoading(""); }
  }
  function releaseNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void request("release", `/api/v1/intelligence/release-notes?repository=${encodeURIComponent(repository)}&base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`);
  }
  function pullRisk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(Number(pull)) || Number(pull) < 1) { setError("Enter a valid pull request number."); return; }
    void request("risk", `/api/v1/intelligence/pull-request/risk?repository=${encodeURIComponent(repository)}&pullNumber=${encodeURIComponent(pull)}`);
  }

  return <motion.section className="advanced-intelligence" id="developer-intelligence" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .34 }}>
    <div className="advanced-head"><div className="panel-icon"><Sparkles size={17} /></div><div><span className="dashboard-kicker">GITHUB + GROQ · ON DEMAND</span><h2>Developer intelligence</h2><p>AI reports grounded in the selected repository’s current GitHub data.</p></div></div>
    <div className="intelligence-actions">
      <button className="intelligence-action" disabled={Boolean(loading)} onClick={() => void request("commits", `/api/v1/intelligence/commits/summary?repository=${encodeURIComponent(repository)}`)}><GitCommitHorizontal size={16} /><span><b>Commit summary</b><small>Summarize the latest 20 commits</small></span>{loading === "commits" ? <LoaderCircle className="spin" size={15} /> : null}</button>
      <form className="intelligence-form" onSubmit={releaseNotes}><Tags size={16} /><label htmlFor="release-base">Release notes</label><input id="release-base" required value={base} onChange={event => setBase(event.target.value)} placeholder="Base ref" /><input aria-label="Head ref" required value={head} onChange={event => setHead(event.target.value)} placeholder="Head ref" /><button className="button button-quiet" disabled={Boolean(loading)}>{loading === "release" ? <LoaderCircle className="spin" size={14} /> : null}Generate</button></form>
      <form className="intelligence-form" onSubmit={pullRisk}><GitPullRequest size={16} /><label htmlFor="risk-pull">PR risk</label><input id="risk-pull" type="number" min="1" required value={pull} onChange={event => setPull(event.target.value)} placeholder="# PR" /><button className="button button-quiet" disabled={Boolean(loading)}>{loading === "risk" ? <LoaderCircle className="spin" size={14} /> : null}Assess</button></form>
      <button className="intelligence-action" disabled={Boolean(loading)} onClick={() => void request("health", `/api/v1/intelligence/health-report?repository=${encodeURIComponent(repository)}`)}><Activity size={16} /><span><b>Repository health</b><small>Facts and recommendations from GitHub</small></span>{loading === "health" ? <LoaderCircle className="spin" size={15} /> : null}</button>
    </div>
    {loading && <div className="intelligence-empty" aria-live="polite"><LoaderCircle className="spin" size={16} /> Loading GitHub evidence and generating a grounded report...</div>}
    {error && <div className="error-card" role="alert">{error}</div>}
    {report && !loading && <article className="intelligence-report"><div className="intelligence-report-head"><BookOpenCheck size={16} /><strong>{report.repository ?? report.githubSnapshot?.repository ?? "Repository report"}</strong>{report.changedFileCount != null && <span>{report.changedFileCount} files · +{report.additions ?? 0} / −{report.deletions ?? 0}</span>}</div><div className="intelligence-report-body">{report.assessment ?? report.report ?? "The provider returned no report."}</div>{report.sources?.length ? <div className="intelligence-sources"><h3>GitHub source commits</h3>{report.sources.map((source, index) => <a key={source.sha ?? index} href={source.url ?? undefined} target="_blank" rel="noreferrer"><code>{source.sha ?? "source"}</code><span>{source.message}</span></a>)}</div> : null}</article>}
    {!report && !loading && !error && <div className="intelligence-empty">Choose a report to fetch live GitHub evidence. AI output is generated only after the request succeeds.</div>}
  </motion.section>;
}
