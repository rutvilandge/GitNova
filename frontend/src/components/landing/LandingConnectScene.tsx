import { motion } from "motion/react";
import { ArrowRight, Copy, GitBranch, LockKeyhole, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

/** Original GITNOVA onboarding scene: a developer follows a change into its repo. */
export default function LandingConnectScene() {
  return (
    <section id="connect-scene" className="connect-scene" aria-labelledby="connect-scene-title">
      <div className="connect-scene-noise" aria-hidden="true" />
      <div className="connect-scene-heading">
        <span className="eyebrow"><span className="eyebrow-dot" /> Start with the repositories you choose</span>
        <h2 id="connect-scene-title">Get your codebase<br /><span>in focus.</span></h2>
        <p>Connect GitHub in a few clicks. GITNOVA builds a useful map of your code and brings review context into one workspace.</p>
        <Link to="/signup" className="button connect-scene-cta">Connect GitHub <ArrowRight size={15} /></Link>
        <div className="connect-scene-privacy"><LockKeyhole size={13} /> You choose which repositories GITNOVA can access</div>
      </div>

      <div className="connect-scene-stage">
        <div className="connect-orbit connect-orbit-one" />
        <div className="connect-orbit connect-orbit-two" />
        <motion.div className="connect-repo-chip" animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <GitBranch size={14} /><span><b>your-repository</b><small>Selected from GitHub</small></span><span className="connect-chip-check">✓</span>
        </motion.div>
        <svg className="developer-illustration" viewBox="0 0 440 500" role="img" aria-label="Original GITNOVA illustration of a developer exploring connected code">
          <defs>
            <linearGradient id="dev-jacket" x1=".1" y1="0" x2=".9" y2="1"><stop stopColor="#d4c8ff"/><stop offset="1" stopColor="#7652ec"/></linearGradient>
            <linearGradient id="dev-screen" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a88cff"/><stop offset="1" stopColor="#4c2fb4"/></linearGradient>
            <filter id="dev-glow"><feGaussianBlur stdDeviation="18"/></filter>
          </defs>
          <ellipse cx="220" cy="430" rx="135" ry="22" fill="#05040c" opacity=".5"/>
          <circle cx="231" cy="239" r="151" fill="#8c69ff" opacity=".18" filter="url(#dev-glow)"/>
          <path d="M105 174c-25-54 2-111 62-116 54-5 96 37 83 91l-16 58-94 11z" fill="#222032"/>
          <path d="M125 136c0-45 28-72 68-72 37 0 65 27 65 65v40c0 39-26 68-63 68-42 0-70-29-70-69z" fill="#f0b99d"/>
          <path d="M119 142c-10-51 20-91 70-91 44 0 69 27 68 65-24-2-43-16-55-37-17 27-43 41-83 44z" fill="#252236"/>
          <path d="M154 148c10-7 21-7 31-1M208 147c10-6 20-5 28 1" fill="none" stroke="#342b43" strokeWidth="5" strokeLinecap="round"/>
          <path d="M187 180c9 6 19 6 28 0" fill="none" stroke="#af626f" strokeWidth="4" strokeLinecap="round"/>
          <path d="M127 257c21-23 42-33 67-33 29 0 55 12 75 37l48 121-52 37-49-89-39 90-93-35 43-128z" fill="url(#dev-jacket)" stroke="#d0c3ff" strokeWidth="3"/>
          <path d="M194 230l34 4 22 83-39 45-35-45z" fill="#f7f4ef"/>
          <path d="M120 273l-43 94c-7 16 3 31 19 30l84-16 13-31-61 3 31-52z" fill="#f0b99d"/>
          <path d="M298 279l30-42c8-12 25-7 24 7l-9 55-42 36z" fill="#f0b99d"/>
          <rect x="286" y="308" width="111" height="81" rx="11" fill="#262236" stroke="#b8a5ff" strokeWidth="3" transform="rotate(-8 286 308)"/>
          <rect x="300" y="321" width="83" height="48" rx="5" fill="url(#dev-screen)" transform="rotate(-8 300 321)"/>
          <path d="M313 347l14-13 13 9 20-19" fill="none" stroke="#d8ff8f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="358" cy="339" r="4" fill="#ff74c7"/>
          <path d="M142 393l-11 47c-2 11 7 20 19 19l61-8 7-25-44-3 16-21zM246 398l27 41c7 11 20 13 30 5l40-33-10-20-36 17-17-42z" fill="#4a357e" stroke="#9c83f2" strokeWidth="3"/>
          <path d="M126 459h89M270 453h80" stroke="#e7ddff" strokeWidth="5" strokeLinecap="round"/>
          <path d="M76 185c-25 12-33 33-34 55M365 141c22 8 37 23 43 44" fill="none" stroke="#b8a5ff" strokeWidth="2" strokeDasharray="5 8" opacity=".65"/>
          <circle cx="42" cy="241" r="7" fill="#ff72c6"/><circle cx="407" cy="190" r="6" fill="#d8ff8f"/>
        </svg>
        <motion.div className="connect-review-card" initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: .15 }}>
          <div className="connect-review-top"><span><Sparkles size={13} /> REVIEW CONTEXT</span><small>ILLUSTRATIVE</small></div>
          <b>Session refresh</b>
          <p>Trace a change from the pull request into the modules it touches.</p>
          <div className="connect-review-path"><i /><code>auth/session.ts</code><span>→</span><code>api/client.ts</code></div>
        </motion.div>
        <div className="connect-terminal">
          <div className="connect-terminal-head"><span className="terminal-lights"><i /><i /><i /></span><span>GITNOVA / CONNECT</span><button type="button" aria-label="Copy repository access note" onClick={() => navigator.clipboard?.writeText("Choose repositories to connect in GITNOVA") }><Copy size={12} /></button></div>
          <div className="connect-terminal-body"><span className="terminal-prompt">›</span><code>Choose repositories to connect in GITNOVA</code><span className="terminal-cursor" /></div>
        </div>
        <span className="connect-stage-caption">Your access. Your repositories. More context in every review.</span>
      </div>
    </section>
  );
}
