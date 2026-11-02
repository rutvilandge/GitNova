import { useEffect, useState, type FormEvent } from "react";
import { BookOpenCheck, CheckCircle2, Database, FileCode2, LoaderCircle, Send, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { apiUrl, csrfHeaders, responseError } from "../../lib/api";

type JobStatus = { id: number; status: string; result: string | null; error: string | null };
type ChatResult = { answer: string; sources: { path: string; chunkIndex: number }[] };

export default function RepositoryAssistant({ repository }: { repository: string }) {
  const [jobId, setJobId] = useState<number | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatResult | null>(null);
  const [chatting, setChatting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jobId || job?.status === "succeeded" || job?.status === "failed") return;
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(apiUrl(`/api/v1/rag/jobs/${jobId}`), { credentials: "include" });
        const status = await response.json() as JobStatus;
        if (!response.ok) throw new Error("Could not check indexing status.");
        if (active) {
          setJob(status);
          if (status.status === "failed") setError("Indexing failed. Check backend configuration and try again.");
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Index status is unavailable.");
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [jobId, job?.status]);

  async function indexRepository() {
    setIndexing(true); setError(""); setJob(null); setChat(null);
    try {
      const headers = new Headers(await csrfHeaders()); headers.set("Content-Type", "application/json");
      const response = await fetch(apiUrl("/api/v1/rag/index"), { method: "POST", credentials: "include", headers, body: JSON.stringify({ repository }) });
      const result = await response.json() as { jobId?: number; chunkCount?: number };
      if (!response.ok || !result.jobId) throw new Error(await responseError(response, "Repository indexing could not be queued."));
      setJobId(result.jobId); setJob({ id: result.jobId, status: "queued", result: null, error: null });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Repository indexing failed."); }
    finally { setIndexing(false); }
  }

  async function askQuestion(prompt: string) {
    if (!prompt.trim()) return;
    setChatting(true); setError("");
    try {
      const headers = new Headers(await csrfHeaders()); headers.set("Content-Type", "application/json");
      const response = await fetch(apiUrl("/api/v1/rag/chat"), { method: "POST", credentials: "include", headers, body: JSON.stringify({ repository, question: prompt.trim() }) });
      const result = await response.json() as ChatResult;
      if (!response.ok) throw new Error(await responseError(response, "Repository chat is unavailable."));
      setChat(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Repository chat failed."); }
    finally { setChatting(false); }
  }

  async function ask(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await askQuestion(question); }
  async function startOnboarding() {
    const prompt = "Give me a source-grounded onboarding tour of this repository. Identify its main entry points, the key modules and how they connect, and the first files a new contributor should read. Cite only indexed repository sources and say clearly when the index lacks enough evidence.";
    setQuestion(prompt);
    await askQuestion(prompt);
  }

  return (
    <motion.section className="assistant-card" id="assistant" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, delay: 0.04 }}>
      <div className="assistant-heading">
        <div className="panel-icon"><Sparkles size={17} /></div>
        <div><span className="dashboard-kicker">RETRIEVAL-AUGMENTED CHAT</span><h2>Ask your repository</h2><p>Answers draw on indexed source files and link back to their locations.</p></div>
        <div className="assistant-actions">
        <button className="button button-quiet onboarding-button" onClick={startOnboarding} disabled={chatting} title="Generate an onboarding tour from indexed repository source"><BookOpenCheck size={14} />Onboard</button>
        <button className="button button-quiet" onClick={indexRepository} disabled={indexing || job?.status === "running"}>
          {indexing || job?.status === "running" ? <LoaderCircle className="spin" size={15} /> : <Database size={15} />}
          {indexing ? "Queueing..." : job?.status === "running" ? "Indexing..." : "Index repository"}
        </button>
        </div>
      </div>
      <p className="assistant-capacity">Up to 40 supported source files (250 KB per snapshot) are indexed for retrieval.</p>
      {job && <p className={`assistant-status assistant-status-${job.status}`} aria-live="polite">{job.status === "succeeded" ? <CheckCircle2 size={14} /> : <LoaderCircle size={14} className="spin" />} Index job {job.id}: {job.status}{job.status === "succeeded" ? " - repository sources are ready" : ""}</p>}
      {error && <div className="error-card" role="alert">{error}</div>}
      <form className="assistant-form" onSubmit={ask}>
        <label className="sr-only" htmlFor="repository-question">Ask about {repository}</label>
        <div className="assistant-input-wrap"><Sparkles size={16} /><input id="repository-question" value={question} maxLength={2000} onChange={(event) => setQuestion(event.target.value)} placeholder={`Ask something about ${repository}...`} /></div>
        <button className="button button-primary" type="submit" disabled={chatting || !question.trim()}>{chatting ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}{chatting ? "Thinking..." : "Ask"}</button>
      </form>
      {!chat && !job && <div className="assistant-empty"><FileCode2 size={17} /><span>Index the selected repository to prepare source-grounded answers.</span></div>}
      {chat && <motion.article className="assistant-answer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="assistant-answer-title"><span className="panel-icon"><Sparkles size={15} /></span><h3>Repository answer</h3></div>
        <p>{chat.answer}</p>
        {chat.sources.length > 0 && <div className="assistant-sources"><b>Referenced source</b>{chat.sources.map((source) => <a key={`${source.path}:${source.chunkIndex}`} href={`https://github.com/${repository}/blob/HEAD/${source.path.split("/").map(encodeURIComponent).join("/")}`} target="_blank" rel="noreferrer"><FileCode2 size={13} /><code>{source.path}</code><span>section {source.chunkIndex + 1}</span></a>)}</div>}
      </motion.article>}
    </motion.section>
  );
}
