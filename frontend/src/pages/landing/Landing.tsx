import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  Clock3,
  GitCommitHorizontal,
  GitFork,
  LockKeyhole,
  Sparkles,
  Terminal,
  Waypoints,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import Brand from "../../components/brand/Brand";
import ProductPreview from "../../components/landing/ProductPreview";
import RepositoryGraph from "../../components/landing/RepositoryGraph";
import IntelligenceStories from "../../components/landing/IntelligenceStories";
import LandingConnectScene from "../../components/landing/LandingConnectScene";
import { features, steps } from "../../components/landing/landingData";

const currentYear = new Date().getFullYear();

export default function Landing() {
  return (
    <main className="app-shell">
      <header className="nav-wrap">
        <Brand />
        <nav className="nav-links">
          <a href="#features">Product</a>
          <a href="#product-stories">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#technology">Technology</a>
        </nav>
        <div className="nav-actions">
          <Link to="/login">Sign In</Link>
          <Link className="button button-primary nav-cta" to="/signup">
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </header>
      <section className="hero-section">
        <div className="hero-glow" />
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="eyebrow">
            <span className="eyebrow-dot" /> GitHub intelligence for modern
            teams
          </span>
          <h1>
            Understand every commit.
            <br />
            Review every change.
            <br />
            <span>Ship with confidence.</span>
          </h1>
          <p className="hero-subtitle">
            GITNOVA connects code, context and intelligence—so your team can see
            what changed, why it matters and what to do next.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/signup">
              Explore GITNOVA <ArrowRight size={15} />
            </Link>
            <a className="button button-quiet" href="#how-it-works">
              See how it works <ArrowDown size={14} />
            </a>
          </div>
          <div className="hero-meta">
            <LockKeyhole size={13} /> Repository permissions stay in your
            control
          </div>
        </motion.div>
        <RepositoryGraph />
        <div className="hero-scroll">
          <span /> Scroll to explore
        </div>
      </section>
      <LandingConnectScene />
      <section className="section section-features" id="features">
        <div className="section-heading">
          <span className="eyebrow">One connected intelligence layer</span>
          <h2>
            Every signal around your code,
            <br />
            finally in one place.
          </h2>
          <p>
            From the pull request to the shape of your codebase, GITNOVA helps
            teams work with better context.
          </p>
        </div>
        <div className="features">
          {features.map(({ icon: Icon, title, detail }, i) => (
            <motion.article
              className="feature-card"
              key={title}
              initial={{ opacity: 0, y: 17 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.18 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
            >
              <span className="feature-icon">
                <Icon size={19} />
              </span>
              <h3>{title}</h3>
              <p>{detail}</p>
              <span className="feature-index">0{i + 1}</span>
            </motion.article>
          ))}
        </div>
      </section>
      <IntelligenceStories />
      <section className="section how-section" id="how-it-works">
        <div className="section-heading">
          <span className="eyebrow">
            A clearer path from code to confidence
          </span>
          <h2>Four steps. A much bigger picture.</h2>
          <p>
            Start with the repositories you choose. GITNOVA brings their context
            into your workflow.
          </p>
        </div>
        <div className="steps-flow">
          {steps.map(({ title, text, icon: Icon }, i) => (
            <motion.article
              className="step-card"
              key={title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.11 }}
            >
              <div className="step-icon">
                <Icon size={18} />
                <span>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              {i < 3 && (
                <div className="step-arrow">
                  <ArrowRight size={16} />
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </section>
      <section className="section ai-section" id="ai-capabilities">
        <div className="ai-copy">
          <span className="eyebrow">AI, grounded in your code</span>
          <h2>Helpful intelligence starts with context.</h2>
          <p>
            GITNOVA combines repository-aware retrieval with focused AI
            workflows. The goal: useful explanations tied to the code your team
            actually owns.
          </p>
          <ul>
            <li>
              <Check size={15} /> Findings connected to changed code
            </li>
            <li>
              <Check size={15} /> Answers based on repository source
            </li>
            <li>
              <Check size={15} /> Clear examples your team can verify
            </li>
          </ul>
          <Link to="/signup" className="text-link">
            Explore AI workflows <ArrowRight size={14} />
          </Link>
        </div>
        <div className="ai-visual">
          <div className="code-panel">
            <div className="code-panel-head">
              <span className="preview-dots">•••</span>
              <span>src/auth/session.ts</span>
              <span className="review-state">REVIEW EXAMPLE</span>
            </div>
            <div className="code-content">
              <div>
                <span className="line-no">18</span>
                <code>
                  <i>export async function</i> refreshSession() {"{"}
                </code>
              </div>
              <div>
                <span className="line-no">19</span>
                <code>
                  {" "}
                  <i>const</i> response = <b>await</b> fetch('/session/refresh')
                </code>
              </div>
              <div className="code-added">
                <span className="line-no">20</span>
                <code>
                  {" "}
                  <b>if</b> (!response.ok) <b>throw new</b> SessionError()
                </code>
              </div>
              <div>
                <span className="line-no">21</span>
                <code>
                  {" "}
                  <b>return</b> response.json()
                </code>
              </div>
              <div>
                <span className="line-no">22</span>
                <code>{"}"}</code>
              </div>
            </div>
            <div className="ai-inline-note">
              <span className="float-icon">
                <Sparkles size={12} />
              </span>
              <div>
                <b>Example AI review</b>
                <p>
                  Consider handling refresh failures explicitly so callers can
                  distinguish an expired session from a network error.
                </p>
                <small>
                  Illustrative example · Review your actual diff in GITNOVA
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section showcase-section" id="product-showcase">
        <div className="section-heading">
          <span className="eyebrow">Designed around your workflow</span>
          <h2>One workspace. Three ways to see more.</h2>
          <p>
            Follow a change from its review through the wider repository
            landscape.
          </p>
        </div>
        <div className="showcase-grid">
          <article className="showcase-card showcase-large">
            <div className="showcase-copy">
              <span className="showcase-number">01 / OVERVIEW</span>
              <h3>See your workspace at a glance.</h3>
              <p>
                Bring delivery signals and repository context into a focused
                home for engineering.
              </p>
            </div>
            <ProductPreview kind="overview" />
          </article>
          <article className="showcase-card">
            <div className="showcase-copy">
              <span className="showcase-number">02 / REVIEW</span>
              <h3>Review with the whole repo in mind.</h3>
              <p>Understand changed code with context close by.</p>
            </div>
            <ProductPreview kind="review" />
          </article>
          <article className="showcase-card">
            <div className="showcase-copy">
              <span className="showcase-number">03 / EXPLORE</span>
              <h3>Follow the paths through your code.</h3>
              <p>Explore the links between components and services.</p>
            </div>
            <ProductPreview kind="graph" />
          </article>
        </div>
      </section>
      <section className="section architecture-section" id="technology">
        <div className="section-heading">
          <span className="eyebrow">Purpose-built architecture</span>
          <h2>Built to connect the developer workflow.</h2>
          <p>
            A clear architecture for secure access, durable processing and
            responsive product experiences.
          </p>
        </div>
        <div className="architecture">
          <div className="arch-lane">
            <div className="arch-node arch-client">
              <span>
                <GitFork size={18} />
              </span>
              <b>GitHub</b>
              <small>OAuth · REST / GraphQL · Webhooks</small>
            </div>
            <div className="arch-connector">
              <i />
            </div>
            <div className="arch-node arch-api">
              <span>
                <Workflow size={18} />
              </span>
              <b>GITNOVA API</b>
              <small>Java 21 · Spring Boot · Security</small>
            </div>
            <div className="arch-connector">
              <i />
            </div>
            <div className="arch-node arch-worker">
              <span>
                <Bot size={18} />
              </span>
              <b>Background worker</b>
              <small>Durable jobs · retries · indexing</small>
            </div>
          </div>
          <div className="arch-branches">
            <div className="arch-node arch-data">
              <span>
                <Terminal size={17} />
              </span>
              <b>Neon PostgreSQL</b>
              <small>Flyway · pgvector · job queue</small>
            </div>
            <div className="arch-node arch-ai">
              <span>
                <BrainCircuit size={17} />
              </span>
              <b>AI + embeddings</b>
              <small>Groq generation · semantic retrieval</small>
            </div>
            <div className="arch-node arch-web">
              <span>
                <Zap size={17} />
              </span>
              <b>GITNOVA Web</b>
              <small>React · Vite · real-time updates</small>
            </div>
          </div>
          <div className="arch-foot">
            <span>
              <GitCommitHorizontal size={13} /> Events in
            </span>
            <span>
              <GitFork size={13} /> Durable work
            </span>
            <span>
              <Waypoints size={13} /> Insights out
            </span>
            <span>
              <Clock3 size={13} /> Live when it matters
            </span>
          </div>
        </div>
      </section>
      <section className="cta-section">
        <div className="cta-orbit cta-orbit-a" />
        <div className="cta-orbit cta-orbit-b" />
        <span className="eyebrow">Your next commit, with more context</span>
        <h2>
          Your repository has a story.
          <br />
          <span>GITNOVA helps you understand it.</span>
        </h2>
        <p>
          Connect your GitHub repositories and see the bigger picture in your
          code.
        </p>
        <Link className="button button-primary" to="/signup">
          Get started with GITNOVA <ArrowRight size={14} />
        </Link>
      </section>
      <footer className="footer">
        <Brand />
        <span>© {currentYear} GITNOVA · Built for the people who build.</span>
        <div className="footer-links">
          <a href="#features">Product</a>
          <a href="#technology">Technology</a>
          <a
            href="https://github.com/rutvilandge/GitNova"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowRight size={11} />
          </a>
        </div>
      </footer>
    </main>
  );
}
