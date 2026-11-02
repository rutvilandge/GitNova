import { motion } from "motion/react";
import { ChevronRight, CircleDot, ShieldCheck, Sparkles } from "lucide-react";

const nodes = [
  { x: 16, y: 51, label: "api" },
  { x: 31, y: 26, label: "auth" },
  { x: 34, y: 73, label: "billing" },
  { x: 52, y: 47, label: "core" },
  { x: 67, y: 26, label: "events" },
  { x: 70, y: 70, label: "data" },
  { x: 86, y: 48, label: "web" },
];
const edges = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [3, 4],
  [3, 5],
  [4, 6],
  [5, 6],
];

export default function RepositoryGraph() {
  return (
    <div
      className="graph-hero"
      aria-label="Animated repository dependency graph"
    >
      <div className="graph-grid" />
      <svg
        className="graph-lines"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {edges.map(([a, b], index) => (
          <motion.line
            key={`${a}-${b}`}
            x1={`${nodes[a].x}%`}
            y1={`${nodes[a].y}%`}
            x2={`${nodes[b].x}%`}
            y2={`${nodes[b].y}%`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.42 }}
            transition={{ duration: 0.8, delay: 0.25 + index * 0.13 }}
          />
        ))}
      </svg>
      {nodes.map((node, index) => (
        <motion.div
          className={`graph-node graph-node-${index}`}
          key={node.label}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.2 + index * 0.12,
            type: "spring",
            stiffness: 170,
          }}
        >
          <span className="graph-node-core">
            <CircleDot size={index === 3 ? 20 : 15} />
          </span>
          <span className="graph-node-label">{node.label}</span>
        </motion.div>
      ))}
      <motion.div
        className="review-float review-float-one"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="float-icon">
          <ShieldCheck size={13} />
        </span>
        <span>
          <b>Change impact</b>
          <small>Linked modules</small>
        </span>
        <span className="float-status">Example</span>
      </motion.div>
      <motion.div
        className="review-float review-float-two"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="float-icon float-violet">
          <Sparkles size={13} />
        </span>
        <span>
          <b>AI review context</b>
          <small>Illustrative review context</small>
        </span>
        <ChevronRight size={13} />
      </motion.div>
      <motion.div
        className="review-float review-float-three"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.45 }}
      >
        <span className="float-icon float-rose"><ShieldCheck size={13} /></span>
        <span className="review-float-detail">
          <b>PR review · example</b>
          <small>Session refresh failure path</small>
        </span>
        <span className="review-priority">P1</span>
      </motion.div>
      <div className="graph-caption">
        <span className="pulse-dot" /> Illustrative repository map{" "}
        <span className="caption-sep">&middot;</span> Connect GitHub to explore
        yours
      </div>
    </div>
  );
}
