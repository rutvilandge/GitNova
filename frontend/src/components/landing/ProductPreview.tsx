import { Activity, GitBranch, Sparkles } from "lucide-react";

type ProductPreviewProps = { kind: "overview" | "review" | "graph" };

export default function ProductPreview({ kind }: ProductPreviewProps) {
  if (kind === "review")
    return (
      <div className="product-preview review-preview">
        <div className="preview-topline">
          <span className="preview-dots">&bull;&bull;&bull;</span>
          <span>pull/248 &middot; update token handling</span>
          <span className="preview-tag">Illustrative review</span>
        </div>
        <div className="diff-row">
          <span className="diff-num">42</span>
          <span className="diff-sign">&minus;</span>
          <code>const token = localStorage.getItem('token')</code>
        </div>
        <div className="diff-row diff-added">
          <span className="diff-num">42</span>
          <span className="diff-sign">+</span>
          <code>const token = await session.getAccessToken()</code>
        </div>
        <div className="ai-comment">
          <span className="float-icon">
            <Sparkles size={12} />
          </span>
          <div>
            <b>Example review note</b>
            <p>
              Session-backed tokens reduce exposure to client-side scripts.
              Verify refresh and expiry handling for this flow.
            </p>
          </div>
        </div>
      </div>
    );
  if (kind === "graph")
    return (
      <div className="product-preview graph-preview">
        <div className="preview-topline">
          <span className="preview-dots">&bull;&bull;&bull;</span>
          <span>Dependency explorer</span>
          <span className="preview-tag">Illustrative graph</span>
        </div>
        <div className="mini-nodes">
          <span>web</span>
          <i />
          <span className="mini-node-active">api</span>
          <i />
          <span>auth</span>
          <i />
          <span>core</span>
        </div>
        <div className="mini-path">
          <GitBranch size={13} /> web &rarr; api &rarr; auth &rarr; core
        </div>
      </div>
    );
  return (
    <div className="product-preview overview-preview">
      <div className="preview-topline">
        <span className="preview-dots">&bull;&bull;&bull;</span>
        <span>Workspace overview</span>
        <span className="preview-tag">Illustrative</span>
      </div>
      <div className="preview-metrics">
        {[
          "Pull requests",
          "Repository health",
          "Activity",
          "Team insights",
        ].map((title) => (
          <div key={title}>
            <small>{title}</small>
            <span>Connect GitHub</span>
          </div>
        ))}
      </div>
      <div className="preview-chart">
        <Activity size={16} />
        <span>Signals from your repositories appear here</span>
      </div>
    </div>
  );
}
