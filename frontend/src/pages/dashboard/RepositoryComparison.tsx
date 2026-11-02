import { useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeftRight, LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import { apiUrl, responseError } from "../../lib/api";

type Analytics = { repository: string; openPullRequests: number; commitsThisWeek: number; mergedPullRequestsThisWeek: number };
type Props = { repositories: string[]; selectedRepository: string };

export default function RepositoryComparison({ repositories, selectedRepository }: Props) {
  const [left, setLeft] = useState(selectedRepository);
  const [right, setRight] = useState("");
  const [result, setResult] = useState<Analytics[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!left || !right || left === right) { setError("Choose two different accessible repositories."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const responses = await Promise.all([left, right].map((repo) => fetch(apiUrl(`/api/v1/github/analytics?repo=${encodeURIComponent(repo)}`), { credentials: "include" })));
      const analytics = await Promise.all(responses.map(async (response) => {
        if (!response.ok) throw new Error(await responseError(response, "Repository analytics could not be loaded."));
        return await response.json() as Analytics;
      }));
      setResult(analytics);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Repository comparison is unavailable."); }
    finally { setLoading(false); }
  }

  const chart = result?.map((repository) => ({
    repository: repository.repository.split("/").at(-1) ?? repository.repository,
    "Commits (7d)": repository.commitsThisWeek,
    "Merged PRs (7d)": repository.mergedPullRequestsThisWeek,
    "Open PRs": repository.openPullRequests,
  }));

  return (
    <motion.section className="comparison-card" id="repository-comparison" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .34, delay: .06 }}>
      <div className="comparison-heading"><div className="panel-icon"><ArrowLeftRight size={16} /></div><div><span className="dashboard-kicker">LIVE REPOSITORY SNAPSHOTS</span><h2>Compare repositories</h2><p>Compare recent delivery activity from the GitHub analytics endpoint.</p></div></div>
      <form className="comparison-form" onSubmit={compare}><label htmlFor="comparison-left" className="sr-only">First repository</label><select id="comparison-left" value={left} onChange={(event) => setLeft(event.target.value)}>{repositories.map((repo) => <option key={repo} value={repo}>{repo}</option>)}</select><ArrowLeftRight size={15} /><label htmlFor="comparison-right" className="sr-only">Second repository</label><select id="comparison-right" value={right} onChange={(event) => setRight(event.target.value)}><option value="">Choose repository...</option>{repositories.filter((repo) => repo !== left).map((repo) => <option key={repo} value={repo}>{repo}</option>)}</select><button className="button button-quiet" type="submit" disabled={loading || repositories.length < 2}>{loading ? <LoaderCircle size={14} className="spin" /> : <ArrowLeftRight size={14} />}{loading ? "Loading..." : "Compare"}</button></form>
      {error && <div className="error-card" role="alert">{error}</div>}
      {loading && <div className="comparison-empty" aria-live="polite"><LoaderCircle size={16} className="spin" /> Fetching both repository snapshots from GitHub...</div>}
      {!loading && !result && !error && <div className="comparison-empty">Choose two repositories to compare their actual GitHub activity.</div>}
      {chart && <div className="comparison-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#ffffff0d" vertical={false} /><XAxis dataKey="repository" tick={{ fill: "#aaa6b4", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#858190", fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#1b1925", border: "1px solid #ffffff20", borderRadius: 8, color: "#f7f4ef", fontSize: 10 }} /><Legend wrapperStyle={{ fontSize: 9, color: "#aaa6b4" }} /><Bar dataKey="Commits (7d)" fill="#9479ff" radius={[4, 4, 0, 0]} /><Bar dataKey="Merged PRs (7d)" fill="#6fc99a" radius={[4, 4, 0, 0]} /><Bar dataKey="Open PRs" fill="#d2a66d" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>}
    </motion.section>
  );
}
