import {
  Activity,
  BrainCircuit,
  Check,
  GitBranch,
  GitFork,
  GitPullRequest,
  Layers3,
  Network,
  Search,
  Sparkles,
} from "lucide-react";

export const features = [
  {
    icon: GitPullRequest,
    title: "AI PR Review",
    detail:
      "Catch risky changes with reviews grounded in your repository and focused on the code that matters.",
  },
  {
    icon: Search,
    title: "Repository-Aware RAG Chat",
    detail:
      "Ask questions about architecture and implementation. Follow answers back to relevant source.",
  },
  {
    icon: Network,
    title: "Dependency Graph",
    detail:
      "Explore how modules connect and follow relationships across your codebase.",
  },
  {
    icon: GitBranch,
    title: "Change Impact Analysis",
    detail:
      "See which parts of your system a proposed change may touch before it ships.",
  },
  {
    icon: BrainCircuit,
    title: "Developer Intelligence",
    detail:
      "Turn commits, pull requests and repository activity into useful engineering context.",
  },
  {
    icon: Activity,
    title: "Real-Time Intelligence",
    detail:
      "Bring GitHub events into a live activity stream with timely notifications.",
  },
];

export const steps = [
  {
    title: "Connect GitHub",
    text: "Authorize the repositories you want to understand.",
    icon: GitFork,
  },
  {
    title: "Analyze Your Code",
    text: "Index repository structure and source with access controls.",
    icon: Layers3,
  },
  {
    title: "Discover Intelligence",
    text: "Review changes, ask questions and explore relationships.",
    icon: Sparkles,
  },
  {
    title: "Ship With Confidence",
    text: "Use deeper context to make your next decision.",
    icon: Check,
  },
];
