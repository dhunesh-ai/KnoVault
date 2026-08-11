/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { Note } from "@/types/Note";
import { useNotesStore } from "@/store/useNotesStore";
import { GitGraph, Network, StickyNote, Tag, Target, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface KnowledgeGraphPreviewProps {
  currentNoteId?: number | null;
  currentTitle?: string;
  category?: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: "current" | "note" | "category" | "goal";
  x: number;
  y: number;
  noteId?: number;
}

export function KnowledgeGraphPreview({ currentNoteId, currentTitle, category }: KnowledgeGraphPreviewProps) {
  const router = useRouter();
  const { notes } = useNotesStore();
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Generate graph nodes dynamically centered around the current note
  const { nodes, links } = useMemo(() => {
    const centerNode: GraphNode = {
      id: "current",
      label: currentTitle || "Current Note",
      type: "current",
      x: 140,
      y: 110,
      noteId: currentNoteId || undefined,
    };

    const relatedNotes = notes
      .filter((n) => n.id !== currentNoteId && (n.category === category || category === "all"))
      .slice(0, 5);

    const generatedNodes: GraphNode[] = [centerNode];
    const generatedLinks: { source: GraphNode; target: GraphNode }[] = [];

    // Category node
    if (category) {
      const catNode: GraphNode = {
        id: "category",
        label: category,
        type: "category",
        x: 60,
        y: 45,
      };
      generatedNodes.push(catNode);
      generatedLinks.push({ source: centerNode, target: catNode });
    }

    // Related Notes nodes positioned radially
    const radius = 80;
    relatedNotes.forEach((note, idx) => {
      const angle = (idx * (2 * Math.PI)) / Math.max(relatedNotes.length, 1) - Math.PI / 4;
      const x = Math.round(140 + radius * Math.cos(angle));
      const y = Math.round(110 + radius * Math.sin(angle));
      
      const nodeObj: GraphNode = {
        id: `note-${note.id}`,
        label: note.title,
        type: "note",
        x: Math.max(30, Math.min(250, x)),
        y: Math.max(30, Math.min(190, y)),
        noteId: note.id,
      };
      generatedNodes.push(nodeObj);
      generatedLinks.push({ source: centerNode, target: nodeObj });
    });

    // Sample goal link
    const goalNode: GraphNode = {
      id: "goal-link",
      label: "Second Brain PKM Goal",
      type: "goal",
      x: 230,
      y: 170,
    };
    generatedNodes.push(goalNode);
    generatedLinks.push({ source: centerNode, target: goalNode });

    return { nodes: generatedNodes, links: generatedLinks };
  }, [currentNoteId, currentTitle, category, notes]);

  const handleNodeClick = (node: GraphNode) => {
    if (node.type === "note" && node.noteId) {
      router.push(`/notes/editor?id=${node.noteId}`);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Obsidian Knowledge Graph</h3>
            <p className="text-[11px] text-muted-foreground">{nodes.length - 1} linked connections</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">
          Interactive
        </span>
      </div>

      {/* SVG Knowledge Graph Canvas */}
      <div className="relative w-full h-[220px] rounded-2xl bg-card border border-border/60 overflow-hidden shadow-inner flex items-center justify-center group">
        
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(124, 77, 255, 0.3) 1px, transparent 0)`,
            backgroundSize: "16px 16px",
          }}
        />

        <svg className="w-full h-full absolute inset-0 z-0">
          <defs>
            <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          
          {/* Connection lines */}
          {links.map((link, idx) => (
            <g key={idx}>
              <line
                x1={link.source.x}
                y1={link.source.y}
                x2={link.target.x}
                y2={link.target.y}
                stroke="url(#purpleGrad)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-[dash_15s_linear_infinite]"
              />
            </g>
          ))}
        </svg>

        {/* Nodes */}
        <div className="relative w-full h-full z-10 pointer-events-auto">
          {nodes.map((node) => {
            const isCurrent = node.type === "current";
            const isHovered = hoveredNode?.id === node.id;
            
            return (
              <motion.div
                key={node.id}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                whileHover={{ scale: 1.2 }}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="relative group">
                  {/* Node Glow */}
                  {isCurrent && (
                    <div className="absolute inset-0 bg-purple-600/40 rounded-full blur-md animate-pulse" />
                  )}

                  {/* Node Badge */}
                  <div
                    className={`relative z-10 flex items-center justify-center transition-all ${
                      isCurrent
                        ? "w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-400"
                        : node.type === "category"
                        ? "w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/40"
                        : node.type === "goal"
                        ? "w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 border border-pink-500/40"
                        : "w-6 h-6 rounded-full bg-card border border-border/80 text-foreground hover:border-purple-500 hover:text-purple-500 shadow-sm"
                    }`}
                  >
                    {isCurrent ? (
                      <GitGraph className="w-4 h-4" />
                    ) : node.type === "category" ? (
                      <Tag className="w-3 h-3" />
                    ) : node.type === "goal" ? (
                      <Target className="w-3 h-3" />
                    ) : (
                      <StickyNote className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Hover Tooltip Popup */}
        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-3 left-3 right-3 bg-popover/95 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-xl z-20 flex items-center justify-between text-xs pointer-events-none"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-foreground truncate">{hoveredNode.label}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                  {hoveredNode.type}
                </span>
              </div>
              {hoveredNode.type === "note" && (
                <span className="text-[10px] text-purple-500 font-bold flex items-center gap-0.5 shrink-0">
                  Open <ArrowUpRight className="w-3 h-3" />
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Linked Nodes List */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Related Vault Connections</span>
        <div className="space-y-1">
          {nodes.filter(n => n.type !== "current").map((n) => (
            <div
              key={n.id}
              onClick={() => handleNodeClick(n)}
              className="flex items-center justify-between p-2 rounded-xl bg-card/60 hover:bg-accent border border-border/30 text-xs text-foreground cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-muted-foreground">
                  {n.type === "category" ? "🏷️" : n.type === "goal" ? "🎯" : "📄"}
                </span>
                <span className="font-medium truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  {n.label}
                </span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 text-purple-500 transition-opacity" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
