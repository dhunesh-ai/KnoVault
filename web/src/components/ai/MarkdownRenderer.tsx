"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into blocks (code blocks vs text blocks)
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3.5 text-sm leading-relaxed text-foreground select-text">
      {blocks.map((block, idx) => {
        if (block.type === "code") {
          return (
            <CodeBlock
              key={idx}
              language={block.language || "code"}
              code={block.content}
            />
          );
        }

        if (block.type === "table") {
          return <TableBlock key={idx} rows={block.rows || []} />;
        }

        return <TextBlock key={idx} text={block.content} />;
      })}
    </div>
  );
}

// ── Code Block Component with 1-click Copy ─────────────────────────
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl border border-border/40 bg-zinc-950 text-zinc-100 overflow-hidden shadow-md font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 select-none">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
          {language}
        </span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors px-2 py-1 rounded-md hover:bg-zinc-800"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700">
        <pre className="whitespace-pre font-mono text-[13px] leading-relaxed text-zinc-200">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// ── Table Component ──────────────────────────────────────────────────
function TableBlock({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border/50 shadow-xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-muted/60 border-b border-border/50 text-foreground font-bold">
          <tr>
            {header.map((col, i) => (
              <th key={i} className="px-3.5 py-2.5">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {body.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-accent/20 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3.5 py-2 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Formatted Text Block Component ───────────────────────────────────
function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={lIdx} className="h-2" />;

        // Header 1
        if (line.startsWith("# ")) {
          return (
            <h1 key={lIdx} className="text-lg font-bold text-foreground mt-3 mb-1.5">
              {renderFormattedSpan(line.replace(/^#\s+/, ""))}
            </h1>
          );
        }

        // Header 2
        if (line.startsWith("## ")) {
          return (
            <h2 key={lIdx} className="text-base font-bold text-foreground mt-3 mb-1">
              {renderFormattedSpan(line.replace(/^##\s+/, ""))}
            </h2>
          );
        }

        // Header 3
        if (line.startsWith("### ")) {
          return (
            <h3 key={lIdx} className="text-sm font-bold text-foreground mt-2 mb-1">
              {renderFormattedSpan(line.replace(/^###\s+/, ""))}
            </h3>
          );
        }

        // Blockquote
        if (line.startsWith("> ")) {
          return (
            <blockquote key={lIdx} className="border-l-2 border-primary/60 pl-3 italic text-muted-foreground my-1 bg-primary/5 py-1 rounded-r-lg">
              {renderFormattedSpan(line.replace(/^>\s+/, ""))}
            </blockquote>
          );
        }

        // Bullet point
        if (/^[\*\-]\s+/.test(line)) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span className="flex-1">{renderFormattedSpan(line.replace(/^[\*\-]\s+/, ""))}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="font-bold text-primary text-xs shrink-0">{numMatch[1]}.</span>
              <span className="flex-1">{renderFormattedSpan(numMatch[2])}</span>
            </div>
          );
        }

        // Normal paragraph line
        return (
          <p key={lIdx} className="leading-relaxed">
            {renderFormattedSpan(line)}
          </p>
        );
      })}
    </div>
  );
}

// ── Inline Markdown Formatter (Bold, Code, Links, Italics) ────────────
function renderFormattedSpan(text: string): React.ReactNode {
  // Regex pattern matching inline code `code`, bold **text**, or links [title](url)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Check for inline code `...`
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Check for bold **...**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    // Check for link [title](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    // Find whichever comes first
    let firstType: "code" | "bold" | "link" | null = null;
    let firstIndex = Infinity;

    if (codeMatch && codeMatch.index !== undefined && codeMatch.index < firstIndex) {
      firstType = "code";
      firstIndex = codeMatch.index;
    }
    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < firstIndex) {
      firstType = "bold";
      firstIndex = boldMatch.index;
    }
    if (linkMatch && linkMatch.index !== undefined && linkMatch.index < firstIndex) {
      firstType = "link";
      firstIndex = linkMatch.index;
    }

    if (!firstType) {
      parts.push(<React.Fragment key={keyIdx++}>{remaining}</React.Fragment>);
      break;
    }

    if (firstIndex > 0) {
      parts.push(<React.Fragment key={keyIdx++}>{remaining.substring(0, firstIndex)}</React.Fragment>);
    }

    if (firstType === "code" && codeMatch) {
      parts.push(
        <code key={keyIdx++} className="px-1.5 py-0.5 rounded-md bg-accent/60 border border-border/40 text-[12px] font-mono text-purple-400">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.substring(firstIndex + codeMatch[0].length);
    } else if (firstType === "bold" && boldMatch) {
      parts.push(
        <strong key={keyIdx++} className="font-bold text-foreground">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.substring(firstIndex + boldMatch[0].length);
    } else if (firstType === "link" && linkMatch) {
      parts.push(
        <a
          key={keyIdx++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 font-medium hover:text-primary/80 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.substring(firstIndex + linkMatch[0].length);
    }
  }

  return <>{parts}</>;
}

// ── Parser Helper ────────────────────────────────────────────────────
interface MarkdownParsedBlock {
  type: "text" | "code" | "table";
  content: string;
  language?: string;
  rows?: string[][];
}

function parseMarkdownBlocks(text: string): MarkdownParsedBlock[] {
  const result: MarkdownParsedBlock[] = [];
  const lines = text.split("\n");

  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  let textLines: string[] = [];

  const flushText = () => {
    if (textLines.length > 0) {
      result.push({ type: "text", content: textLines.join("\n") });
      textLines = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      result.push({ type: "table", content: "", rows: tableRows });
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block demarcation
    if (line.trim().startsWith("```")) {
      if (inCode) {
        // End code block
        result.push({ type: "code", content: codeLines.join("\n"), language: codeLang });
        codeLines = [];
        inCode = false;
      } else {
        // Start code block
        flushText();
        flushTable();
        inTable = false;
        inCode = true;
        codeLang = line.trim().replace(/^```/, "").trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // Table row demarcation (contains |)
    const isTableRow = line.trim().startsWith("|") && line.trim().endsWith("|");
    const isSeparatorRow = line.trim().startsWith("|") && /^[|\s-:]+$/.test(line.trim());

    if (isTableRow) {
      if (isSeparatorRow) continue; // skip markdown header divider line
      flushText();
      inTable = true;
      const cells = line
        .trim()
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
      inTable = false;
    }

    textLines.push(line);
  }

  if (inCode) {
    result.push({ type: "code", content: codeLines.join("\n"), language: codeLang });
  } else if (inTable) {
    flushTable();
  } else {
    flushText();
  }

  return result;
}
