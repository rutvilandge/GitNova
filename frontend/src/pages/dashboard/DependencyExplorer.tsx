import { useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertCircle, Box, GitBranch, LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import { apiUrl } from "../../lib/api";

type GraphData = { repository: string; indexedFiles: number; nodes: { id: string; path: string; label: string }[]; edges: { source: string; target: string }[] };
type Props = { repository: string };

export default function DependencyExplorer({ repository }: Props) {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!repository) return;
    let active = true;
    fetch(apiUrl(`/api/v1/intelligence/dependencies?repository=${encodeURIComponent(repository)}`), { credentials: "include" })
      .then(async (response) => {
        const data = await response.json() as GraphData & { detail?: string; message?: string };
        if (!response.ok) throw new Error(data.detail || data.message || "Dependency graph is unavailable.");
        if (active) { setGraph(data); setSelected(data.nodes[0]?.id ?? null); }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Dependency graph is unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repository]);

  const flow = useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };
    const nodes: Node[] = graph.nodes.map((node, index) => ({
      id: node.id,
      type: "default",
      position: { x: 34 + (index % 4) * 220, y: 24 + Math.floor(index / 4) * 112 },
      data: { label: <div className={`dependency-node-label ${selected === node.id ? "selected" : ""}`}><span><Box size={13} /></span><small>{node.label}</small></div> },
      className: selected === node.id ? "dependency-node-active" : "dependency-node",
    }));
    const edges: Edge[] = graph.edges.map((edge, index) => ({
      id: `${edge.source}->${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      animated: edge.source === selected || edge.target === selected,
      style: { stroke: edge.source === selected || edge.target === selected ? "#b8a5ff" : "#514b67", strokeWidth: edge.source === selected || edge.target === selected ? 1.7 : 1 },
    }));
    return { nodes, edges };
  }, [graph, selected]);

  const selectedNode = graph?.nodes.find((node) => node.id === selected);
  const usedBy = graph?.edges.filter((edge) => edge.target === selected).length ?? 0;
  const dependsOn = graph?.edges.filter((edge) => edge.source === selected).length ?? 0;

  return (
    <motion.section className="dependency-explorer" id="dependencies" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }}>
      <div className="dependency-heading"><div><span className="dashboard-kicker">SOURCE-ANALYZED RELATIONSHIPS</span><h2>Dependency explorer</h2><p>Module links extracted from your indexed repository files.</p></div>{graph && <div className="graph-counts"><span><b>{graph.nodes.length}</b> files</span><span><b>{graph.edges.length}</b> links</span></div>}</div>
      {loading && <div className="graph-state" aria-live="polite"><LoaderCircle className="spin" size={18} /><span>Loading indexed repository relationships...</span></div>}
      {!loading && error && <div className="graph-state graph-error"><AlertCircle size={18} /><div><strong>Dependency graph unavailable</strong><p>{error}</p></div></div>}
      {!loading && graph && graph.nodes.length === 0 && <div className="graph-state">No supported indexed files are available for dependency analysis.</div>}
      {!loading && graph && graph.nodes.length > 0 && <div className="dependency-layout">
        <div className="dependency-canvas" aria-label={`Dependency graph for ${repository}`}><ReactFlow nodes={flow.nodes} edges={flow.edges} fitView fitViewOptions={{ padding: 0.22 }} nodesDraggable={false} nodesConnectable={false} onNodeClick={(_, node) => setSelected(node.id)} proOptions={{ hideAttribution: true }}><Background color="#77718b" gap={24} size={1} /><MiniMap nodeColor={(node) => node.id === selected ? "#b8a5ff" : "#514b67"} maskColor="#111019bb" /><Controls showInteractive={false} /></ReactFlow></div>
        <aside className="dependency-inspector"><span className="dashboard-kicker">SELECTED FILE</span>{selectedNode ? <><h3>{selectedNode.label}</h3><code>{selectedNode.path}</code><div className="impact-metrics"><div><GitBranch size={14} /><b>{dependsOn}</b><span>direct dependencies</span></div><div><GitBranch size={14} className="branch-reverse" /><b>{usedBy}</b><span>direct dependents</span></div></div><p>Select a node to inspect its directly connected modules.</p></> : <p>Select a node in the graph.</p>}</aside>
      </div>}
    </motion.section>
  );
}
