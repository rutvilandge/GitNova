import { useState, type FormEvent } from "react";
import { ArrowDownRight, FileDiff, GitBranch, LoaderCircle, Radar } from "lucide-react";
import { motion } from "motion/react";
import { apiUrl, responseError } from "../../lib/api";

type Impact = {
  repository: string;
  pullNumber: number;
  changedFiles: { path: string; status: string; additions: number; deletions: number; changes: number; indexed: boolean }[];
  impactedFiles: { path: string; dependencyHops: number; connectedTo: string }[];
  indexedFiles: number;
  analyzedLinks: number;
  impactListTruncated: boolean;
};

export default function ChangeImpact({ repository }: { repository: string }) {
  const [number, setNumber] = useState("");
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(Number(number)) || Number(number) < 1) { setError("Enter a valid pull request number."); return; }
    setLoading(true); setError(""); setImpact(null);
    try {
      const response = await fetch(apiUrl(`/api/v1/intelligence/impact?repository=${encodeURIComponent(repository)}&pullNumber=${encodeURIComponent(number)}`), { credentials: "include" });
      if (!response.ok) throw new Error(await responseError(response, "Change impact could not be calculated."));
      setImpact(await response.json() as Impact);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Change impact could not be calculated."); }
    finally { setLoading(false); }
  }

  return (
    <motion.section className="change-impact" id="change-impact" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, delay: 0.03 }}>
      <div className="impact-heading"><div className="panel-icon"><Radar size={17} /></div><div><span className="dashboard-kicker">DEPENDENCY-AWARE ANALYSIS</span><h2>Change impact</h2><p>Trace downstream modules touched by a pull request's changed files.</p></div></div>
      <form className="impact-form" onSubmit={analyze}><label htmlFor="impact-pr-number">Pull request</label><div><span>{repository}</span><input id="impact-pr-number" type="number" min="1" required value={number} onChange={(event) => setNumber(event.target.value)} placeholder="PR number" /><button className="button button-primary" type="submit" disabled={loading || !repository}>{loading ? <LoaderCircle className="spin" size={15} /> : <Radar size={15} />}{loading ? "Tracing..." : "Analyze impact"}</button></div></form>
      {error && <div className="error-card" role="alert">{error}</div>}
      {loading && <div className="impact-empty" aria-live="polite"><LoaderCircle className="spin" size={17} /> Comparing GitHub PR files with indexed dependency relationships...</div>}
      {impact && <div className="impact-results">
        <div className="impact-summary"><span><b>{impact.changedFiles.length}</b> changed files</span><span><b>{impact.impactedFiles.length}</b> downstream files</span><span><b>{impact.analyzedLinks}</b> indexed links</span></div>
        {impact.changedFiles.some((file) => !file.indexed) && <p className="impact-note">Some changed files are outside the indexed snapshot, so only indexed files were used as impact roots.</p>}
        <div className="impact-columns"><div><h3><FileDiff size={14} /> Pull request changes</h3>{impact.changedFiles.length ? impact.changedFiles.map((file) => <article className="impact-file" key={file.path}><code>{file.path}</code><span className="impact-diff-count"><i>+{file.additions}</i><em>-{file.deletions}</em></span></article>) : <p className="impact-note">GitHub returned no changed files for this pull request.</p>}</div>
          <div><h3><GitBranch size={14} /> Downstream modules</h3>{impact.impactedFiles.length ? impact.impactedFiles.map((file) => <article className="impact-file impact-dependent" key={file.path}><span className="impact-distance"><ArrowDownRight size={12} /> {file.dependencyHops} {file.dependencyHops === 1 ? "hop" : "hops"}</span><code>{file.path}</code><small>connected through {file.connectedTo}</small></article>) : <p className="impact-note">No downstream indexed modules were found for these changed paths.</p>}</div></div>
        {impact.impactListTruncated && <p className="impact-note">The dependency impact list reached its 200-file safety limit.</p>}
      </div>}
      {!impact && !loading && !error && <div className="impact-empty">Enter a pull request number to trace its changed files through the selected repository's indexed source links.</div>}
    </motion.section>
  );
}
