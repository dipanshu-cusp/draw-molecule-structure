"use client";

import { FileText } from "lucide-react";
import React from "react";
import { cn } from "@/app/lib/utils";

interface Reference {
  title?: string;
  uri?: string;
  content?: string;
}

interface InlineCitationProps {
  citationNumber: number;
  reference?: Reference;
  isUserMessage?: boolean;
}

/**
 * Inline citation component that displays a citation number with a PDF icon
 * Clicking on it redirects to the citation link
 */
export function InlineCitation({
  citationNumber,
  reference,
  isUserMessage = false,
}: InlineCitationProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reference?.uri) {
      window.open(reference.uri, "_blank", "noopener,noreferrer");
    }
  };

  const hasLink = !!reference?.uri;

  return (
    <span
      onClick={hasLink ? handleClick : undefined}
      title={reference?.title || `Citation ${citationNumber}`}
      className={cn(
        "inline-flex items-center gap-0.5 mx-0.5 px-1 py-0.5 rounded text-xs font-medium transition-colors",
        hasLink && "cursor-pointer",
        isUserMessage
          ? cn(
              "bg-blue-500/30 text-blue-100",
              hasLink && "hover:bg-blue-400/40"
            )
          : cn(
              "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
              hasLink && "hover:bg-blue-200 dark:hover:bg-blue-800/50"
            )
      )}
    >
      <sup className="font-semibold">{citationNumber}</sup>
      {hasLink && (
        <FileText
          className={cn(
            "w-3 h-3",
            isUserMessage
              ? "text-blue-200"
              : "text-blue-500 dark:text-blue-400"
          )}
        />
      )}
    </span>
  );
}

interface ParsedTextPart {
  type: "text" | "citation";
  content: string;
  citationNumber?: number;
}

/**
 * Parse text with citation markers like [1], [2], etc.
 * Returns an array of text parts and citation parts
 */
export function parseCitations(text: string): ParsedTextPart[] {
  const parts: ParsedTextPart[] = [];
  // Match citation patterns like [1], [2], [10], etc.
  const citationRegex = /\[(\d+)\]/g;
  
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the citation
    parts.push({
      type: "citation",
      content: match[0],
      citationNumber: parseInt(match[1], 10),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last citation
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

interface RenderTextWithCitationsProps {
  text: string;
  references?: Reference[];
  isUserMessage?: boolean;
}

/**
 * Render text with inline citations replaced by clickable citation components
 * This is meant to be used within ReactMarkdown custom renderers
 */
export function renderTextWithCitations(
  text: string,
  references?: Reference[],
  isUserMessage?: boolean
): React.ReactNode[] {
  const parts = parseCitations(text);

  return parts.map((part, index) => {
    if (part.type === "citation" && part.citationNumber !== undefined) {
      // Citation numbers in Vertex AI are 1-indexed
      const refIndex = part.citationNumber - 1;
      const reference = references?.[refIndex];

      return (
        <InlineCitation
          key={index}
          citationNumber={part.citationNumber}
          reference={reference}
          isUserMessage={isUserMessage}
        />
      );
    }

    return <React.Fragment key={index}>{part.content}</React.Fragment>;
  });
}

/**
 * Recursively process React children to replace citation patterns with InlineCitation components
 * This handles nested elements from ReactMarkdown
 */
export function processChildrenWithCitations(
  children: React.ReactNode,
  references?: Reference[],
  isUserMessage?: boolean
): React.ReactNode {
  return React.Children.map(children, (child) => {
    // If it's a string, process it for citations
    if (typeof child === "string") {
      const parts = parseCitations(child);
      
      // If no citations found, return the original string
      if (parts.length === 1 && parts[0].type === "text") {
        return child;
      }
      
      return (
        <>
          {parts.map((part, index) => {
            if (part.type === "citation" && part.citationNumber !== undefined) {
              const refIndex = part.citationNumber - 1;
              const reference = references?.[refIndex];
              
              return (
                <InlineCitation
                  key={index}
                  citationNumber={part.citationNumber}
                  reference={reference}
                  isUserMessage={isUserMessage}
                />
              );
            }
            return <React.Fragment key={index}>{part.content}</React.Fragment>;
          })}
        </>
      );
    }

    // If it's a React element, recursively process its children
    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<{ children?: React.ReactNode }>;
      if (element.props.children) {
        return React.cloneElement(element, {
          ...element.props,
          children: processChildrenWithCitations(
            element.props.children,
            references,
            isUserMessage
          ),
        });
      }
    }

    // Return other types of children as-is
    return child;
  });
}

export default InlineCitation;
