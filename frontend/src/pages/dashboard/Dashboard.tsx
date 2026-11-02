import { lazy, Suspense, useEffect, useState } from "react";
import {
  Activity,
  GitCommitHorizontal,
  GitBranch,
  GitMerge,
  GitPullRequest,
  GitFork,
  LogOut,
  Sparkles,
  TerminalSquare,
  GitCompare,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RadioTower,
  Radar,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "motion/react";
import Brand from "../../components/brand/Brand";
import { apiUrl, csrfHeaders, responseError } from "../../lib/api";
import ChangeImpact from "./ChangeImpact";
import RepositoryComparison from "./RepositoryComparison";
import AdvancedIntelligence from "./AdvancedIntelligence";
const DependencyExplorer = lazy(() => import("./DependencyExplorer"));
import ReviewWorkspace from "./ReviewWorkspace";
import RepositoryAssistant from "./RepositoryAssistant";

type Repository = {
  id: number;
  fullName: string;
  private: boolean;
  description: string | null;
  htmlUrl: string;
};
type DailyCount = { day: string; commits: number };
type Analytics = {
  repository: string;
  openPullRequests: number;
  commitsThisWeek: number;
  mergedPullRequestsThisWeek: number;
  dailyCommits: DailyCount[];
};
type ActivityItem = {
  id: string;
  type: string;
  repository: string | null;
  action: string | null;
  at: string;
};

export default function Dashboard() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analyticsError, setAnalyticsError] = useState<{
    repo: string;
    message: string;
  } | null>(null);
  const [connected, setConnected] = useState(false);
  const [activityState, setActivityState] = useState<"connecting" | "live" | "disconnected">("connecting");
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [createRepoError, setCreateRepoError] = useState("");
  const [createRepoNotice, setCreateRepoNotice] = useState("");
  const navigate = useNavigate();

  const currentAnalyticsError =
    analyticsError?.repo === selectedRepo ? analyticsError.message : "";
  const analyticsLoading =
    connected &&
    Boolean(selectedRepo) &&
    analytics?.repository !== selectedRepo &&
    !currentAnalyticsError;

  useEffect(() => {
    let active = true;
    fetch(apiUrl("/api/v1/github/repositories"), { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401 || response.status === 409) return;
        if (!response.ok)
          throw new Error("Repository information is temporarily unavailable.");
        const data = (await response.json()) as Repository[];
        if (active) {
          setRepositories(data);
          setSelectedRepo(data[0]?.fullName ?? "");
          setConnected(true);
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error && cause.message !== "Failed to fetch"
          ? cause.message
          : "GITNOVA could not reach the API. Check the connection and refresh.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!connected) return;
    const stream = new EventSource(
      apiUrl("/api/v1/intelligence/activity/stream"),
      { withCredentials: true },
    );
    stream.addEventListener("github", (event) => {
      setActivityState("live");
      try {
        const item = JSON.parse(
          (event as MessageEvent<string>).data,
        ) as ActivityItem;
        setActivities((current) =>
          [
            item,
            ...current.filter((existing) => existing.id !== item.id),
          ].slice(0, 12),
        );
      } catch {
        /* Ignore malformed activity and keep the stream available. */
      }
    });
    stream.onopen = () => setActivityState("live");
    stream.onerror = () => { setActivityState("disconnected"); stream.close(); };
    return () => { stream.close(); setActivityState("disconnected"); };
  }, [connected]);

  useEffect(() => {
    if (!connected || !selectedRepo) return;
    let active = true;
    fetch(
      apiUrl(
        `/api/v1/github/analytics?repo=${encodeURIComponent(selectedRepo)}`,
      ),
      { credentials: "include" },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 409
              ? "Reconnect GitHub to view repository analytics."
              : "Analytics could not be loaded. Try again shortly.",
          );
        const data = (await response.json()) as Analytics;
        if (active) setAnalytics(data);
      })
      .catch((cause) => {
        if (active)
          setAnalyticsError({
            repo: selectedRepo,
            message:
              cause instanceof Error
                ? cause.message
                : "Analytics could not be loaded.",
          });
      });
    return () => {
      active = false;
    };
  }, [connected, selectedRepo]);

  async function logout() {
    try {
      const headers = await csrfHeaders();
      const response = await fetch(apiUrl("/api/v1/auth/logout"), {
        method: "POST",
        credentials: "include",
        headers,
      });
      if (!response.ok) throw new Error("Sign out failed.");
      navigate("/login");
    } catch {
      setError("Sign out failed. Please try again.");
    }
  }

  async function createRepository(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingRepo(true);
    setCreateRepoError("");
    setCreateRepoNotice("");
    try {
      const headers = await csrfHeaders();
      const response = await fetch(apiUrl("/api/v1/github/repositories"), {
        method: "POST",
        credentials: "include",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRepoName.trim(), description: newRepoDescription.trim(), private: newRepoPrivate }),
      });
      if (!response.ok) throw new Error(await responseError(response, "GitHub could not create this repository."));
      const created = (await response.json()) as Repository;
      setRepositories((current) => [created, ...current.filter((repo) => repo.id !== created.id)]);
      setSelectedRepo(created.fullName);
      setAnalytics(null);
      setAnalyticsError(null);
      setCreateRepoNotice(`${created.fullName} was created on GitHub and is ready to select.`);
      setNewRepoName("");
      setNewRepoDescription("");
    } catch (cause) {
      setCreateRepoError(cause instanceof Error ? cause.message : "GitHub could not create this repository.");
    } finally {
      setCreatingRepo(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <aside className="dash-sidebar">
        <Brand />
        <div className="dash-nav-label">Workspace</div>
        <a className="dash-nav active" href="#overview">
          <Activity size={15} />
          Overview
        </a>
        <a className="dash-nav" href="#pull-requests">
          <GitPullRequest size={15} />
          Pull requests
        </a>
        <a className="dash-nav" href="#assistant">
          <Sparkles size={15} />
          AI assistant
        </a>
        <a className="dash-nav" href="#dependencies">
          <GitBranch size={15} />
          Dependencies
        </a>
        <div className="dash-nav-label">Analysis</div>
        <a className="dash-nav" href="#change-impact">
          <Radar size={15} />
          Change impact
        </a>
        <a className="dash-nav" href="#developer-intelligence">
          <Sparkles size={15} />
          Intelligence
        </a>
        <a className="dash-nav" href="#repository-comparison">
          <GitCompare size={15} />
          Compare
        </a>
        <a className="dash-nav" href="#live-activity">
          <RadioTower size={15} />
          Live activity
        </a>
        <div className="dash-nav-label">Account</div>
        <button className="dash-nav dash-nav-button" onClick={logout}>
          <LogOut size={15} />
          Sign out
        </button>
      </aside>
      <section className="dash-main" id="overview">
        <div className="dash-top">
          <div>
            <span className="dashboard-kicker">ENGINEERING INTELLIGENCE / OVERVIEW</span>
            <h1>Workspace overview</h1>
          </div>
          <a
            className="button button-quiet"
            href={apiUrl("/oauth2/authorization/github")}
          >
            <GitFork size={15} />
            {connected ? "GitHub connected" : "Connect GitHub"}
          </a>
        </div>
        <p className="dashboard-intro">Your repositories and engineering insights, in one place.</p>
        {error && (
          <div className="error-card" role="alert">
            {error}
          </div>
        )}
        {!connected && !loading && !error && (
          <div className="empty-card">
            <div className="empty-art">
              <GitFork size={24} />
            </div>
            <h2>Connect your GitHub account</h2>
            <p>
              GITNOVA needs your GitHub authorization to show repositories you
              can access. Access follows the permissions you grant on GitHub.
            </p>
            <a
              className="button button-primary"
              href={apiUrl("/oauth2/authorization/github")}
            >
              <GitFork size={15} />
              Authorize GitHub
            </a>
            <p style={{ marginTop: 16 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#b8a5ff" }}>
                Sign in
              </Link>
            </p>
          </div>
        )}
        {loading && (
          <div className="empty-card" aria-live="polite">
            Loading your repositories...
          </div>
        )}
        {connected && !loading && repositories.length === 0 && (
          <div className="empty-card">
            <div className="empty-art">
              <TerminalSquare size={24} />
            </div>
            <h2>No repositories available</h2>
            <p>
              GitHub did not return any repositories for this account. Check the
              access granted to GITNOVA on GitHub and refresh this page.
            </p>
          </div>
        )}
        {connected && !loading && (
          <section className="repository-create" aria-labelledby="repository-create-title">
            <div className="repository-create-copy">
              <span className="dashboard-kicker">NEW CODEBASE</span>
              <h2 id="repository-create-title">Create a GitHub repository</h2>
              <p>GITNOVA creates it in the GitHub account you connected. GitHub remains the source of truth for its code and permissions.</p>
            </div>
            <form className="repository-create-form" onSubmit={(event) => void createRepository(event)}>
              <label htmlFor="new-repository-name">Repository name</label>
              <input id="new-repository-name" value={newRepoName} onChange={(event) => setNewRepoName(event.target.value)} required maxLength={100} pattern="[A-Za-z0-9_.-]+" placeholder="e.g. api-service" />
              <label htmlFor="new-repository-description">Description <span>Optional</span></label>
              <input id="new-repository-description" value={newRepoDescription} onChange={(event) => setNewRepoDescription(event.target.value)} maxLength={350} placeholder="What will this repository contain?" />
              <label className="repository-private-choice"><input type="checkbox" checked={newRepoPrivate} onChange={(event) => setNewRepoPrivate(event.target.checked)} /><span><LockKeyhole size={13} /> Private repository</span></label>
              <button className="button button-primary" type="submit" disabled={creatingRepo || !newRepoName.trim()}>{creatingRepo ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}{creatingRepo ? "Creating on GitHub…" : "Create repository"}</button>
              {createRepoError && <p className="repository-create-message is-error" role="alert">{createRepoError}</p>}
              {createRepoNotice && <p className="repository-create-message" role="status">{createRepoNotice}</p>}
            </form>
          </section>
        )}
        {connected && repositories.length > 0 && (
          <>
            <div className="workspace-strip">
              <div className="workspace-strip-copy">
                <span className="dashboard-kicker">CONNECTED WORKSPACE</span>
                <strong>{repositories.length} repositories</strong>
              </div>
              <label className="repo-select-wrap" htmlFor="repo-select">
                <span>Active repository</span>
                <select id="repo-select" value={selectedRepo} onChange={(event) => { setSelectedRepo(event.target.value); setAnalyticsError(null); }}>
                  {repositories.map((repo) => <option key={repo.id} value={repo.fullName}>{repo.fullName}{repo.private ? " · private" : ""}</option>)}
                </select>
              </label>
              <a className="workspace-link" href={repositories.find((repo) => repo.fullName === selectedRepo)?.htmlUrl} target="_blank" rel="noreferrer">View on GitHub ↗</a>
            </div>
            <section className="repository-section" aria-label="Accessible repositories">
              <div className="section-title-row"><div><span className="dashboard-kicker">YOUR CODEBASES</span><h2>Repositories</h2></div><span>{repositories.length} accessible</span></div>
              <div className="repository-grid">
                {repositories.slice(0, 4).map((repo, index) => <motion.button key={repo.id} className={`repository-card ${selectedRepo === repo.fullName ? "is-selected" : ""}`} onClick={() => { setSelectedRepo(repo.fullName); setAnalyticsError(null); }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.045, duration: 0.28 }} whileHover={{ y: -2 }}>
                  <span className="repository-card-top"><span className="repo-avatar">{repo.fullName.split("/").at(-1)?.slice(0, 1).toUpperCase()}</span><span className="repo-visibility">{repo.private ? "PRIVATE" : "PUBLIC"}</span></span>
                  <strong>{repo.fullName}</strong>
                  <span className="repository-description">{repo.description || "No repository description provided."}</span>
                  <span className="repository-card-foot"><span>{selectedRepo === repo.fullName ? "Selected workspace" : "Open workspace"}</span><GitBranch size={14} /></span>
                </motion.button>)}
              </div>
              {repositories.length > 4 && <p className="repo-more-note">Showing 4 of {repositories.length}. Choose any repository from the active repository menu above.</p>}
            </section>
            {currentAnalyticsError && (
              <div className="error-card" role="alert">
                {currentAnalyticsError}
              </div>
            )}
            {analyticsLoading && (
              <div className="analytics-loading" aria-live="polite">
                Loading live GitHub analytics...
              </div>
            )}
            {analytics?.repository === selectedRepo && (
              <>
                <div className="analytics-overview-head"><div><span className="dashboard-kicker">LIVE FROM GITHUB</span><h2>Repository pulse</h2><p>{analytics.repository} · updated from the current GitHub snapshot</p></div><span className="snapshot-mark"><span /> Connected</span></div>
                <div className="analytics-grid">
                  <article className="analytics-card">
                    <div className="analytics-card-head"><span>Open pull requests</span><i><GitPullRequest size={14} /></i></div>
                    <strong>{analytics.openPullRequests}</strong>
                    <small>Current repository snapshot</small>
                  </article>
                  <article className="analytics-card">
                    <div className="analytics-card-head"><span>Commits this week</span><i><GitCommitHorizontal size={14} /></i></div>
                    <strong>{analytics.commitsThisWeek}</strong>
                    <small>Recent GitHub commit history</small>
                  </article>
                  <article className="analytics-card">
                    <div className="analytics-card-head"><span>Merged this week</span><i><GitMerge size={14} /></i></div>
                    <strong>{analytics.mergedPullRequestsThisWeek}</strong>
                    <small>Recent closed pull requests</small>
                  </article>
                </div>
                <section className="chart-card">
                  <div className="chart-card-head">
                    <div>
                      <span className="dashboard-kicker">DELIVERY PULSE / UTC</span>
                      <h2>Commit activity</h2>
                      <p>{analytics.repository} · last seven days</p>
                    </div>
                    <div className="chart-total"><strong>{analytics.dailyCommits.reduce((total, item) => total + item.commits, 0)}</strong><span>commits in view</span></div>
                  </div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analytics.dailyCommits}
                        margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                      >
                        <defs><linearGradient id="commitGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9b83ff" stopOpacity={0.32} /><stop offset="100%" stopColor="#9b83ff" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid stroke="#ffffff0d" vertical={false} />
                        <XAxis
                          dataKey="day"
                          tickFormatter={(value) => value.slice(5)}
                          tick={{ fill: "#8f8b9b", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "#8f8b9b", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ stroke: "#b8a5ff55", strokeDasharray: "3 4" }}
                          contentStyle={{
                            background: "#1b1925",
                            border: "1px solid #ffffff20",
                            borderRadius: 8,
                            color: "#f7f4ef",
                          }}
                        />
                        <Area type="monotone" dataKey="commits" name="Commits" stroke="#a895ff" strokeWidth={2.5} fill="url(#commitGlow)" activeDot={{ r: 4, fill: "#d8ccff", stroke: "#6d4aff", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </>
            )}
            <ReviewWorkspace
              api={import.meta.env.VITE_API_URL ?? ""}
              repository={selectedRepo}
            />
            <AdvancedIntelligence repository={selectedRepo} />
            <RepositoryComparison repositories={repositories.map((repo) => repo.fullName)} selectedRepository={selectedRepo} />
            <RepositoryAssistant key={selectedRepo} repository={selectedRepo} />
            <Suspense fallback={<div className="graph-state" aria-live="polite">Preparing dependency explorer...</div>}><DependencyExplorer key={`graph-${selectedRepo}`} repository={selectedRepo} /></Suspense>
            <ChangeImpact repository={selectedRepo} />
            <section className="activity-feed" id="live-activity">
              <div className="activity-feed-head">
                <div>
                  <h2>Live repository activity</h2>
                  <p>
                    Signed GitHub webhook events for repositories you can
                    access.
                  </p>
                </div>
                <span className={`live-pill live-${connected ? activityState : "disconnected"}`}>
                  <span className="pulse-dot" /> {!connected ? "Disconnected" : activityState === "live" ? "Live" : activityState === "connecting" ? "Connecting" : "Disconnected"}
                </span>
              </div>
              {activities.length === 0 ? (
                  <div className="activity-empty">
                {activityState === "disconnected" ? "Activity stream disconnected. Check the API connection, then refresh to reconnect." : "Waiting for GitHub webhook events from repositories you can access."}
                </div>
              ) : (
                activities.map((item) => (
                  <article className="activity-event" key={item.id}>
                    <span className="feature-icon">
                      <Activity size={15} />
                    </span>
                    <div>
                      <b>
                        {item.repository || "Repository event"} - {item.type}
                      </b>
                      <p>
                        {item.action || "Event received"} -{" "}
                        {new Date(item.at).toLocaleString()}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
        {(!connected || repositories.length === 0) && (
          <section className="analysis-gate" aria-label="Analysis workspaces">
            <div className="analysis-gate-heading"><span className="dashboard-kicker">ANALYSIS WORKSPACES</span><h2>Connect a repository to explore its signals.</h2><p>These workspaces use your selected GitHub repository. Connect GitHub and choose a repository to load real results.</p></div>
            <div className="analysis-gate-grid">
              <article id="change-impact"><span>01 / CHANGE IMPACT</span><strong>Trace a pull request through dependent files</strong><small>Available after repository connection</small></article>
              <article id="developer-intelligence"><span>02 / INTELLIGENCE</span><strong>Generate summaries and repository reports</strong><small>Available after repository connection</small></article>
              <article id="repository-comparison"><span>03 / COMPARISON</span><strong>Compare activity across repositories</strong><small>Requires at least two accessible repositories</small></article>
              <article id="live-activity"><span>04 / LIVE ACTIVITY</span><strong>Follow verified GitHub webhook events</strong><small>Available after repository connection</small></article>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
