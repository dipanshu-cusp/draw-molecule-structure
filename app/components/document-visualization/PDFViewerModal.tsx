"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ExternalLink,
  Loader2,
  User,
  Calendar,
  Tag,
  FlaskConical,
  Beaker,
  FileText,
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { NotebookMetadata } from "../../types/chat";

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  pageNumber?: number;
  notebook?: NotebookMetadata;
  onFindSimilar?: (notebook: NotebookMetadata) => void;
  onFlagIssue?: (notebook: NotebookMetadata) => void;
}

function PanelSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {icon && (
        <span className="text-gray-400 dark:text-gray-500 mt-0.5">{icon}</span>
      )}
      <div className="min-w-0">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">
          {label}
        </span>
        <span className="text-sm text-gray-900 dark:text-white break-words">
          {value || "—"}
        </span>
      </div>
    </div>
  );
}

function PlaceholderPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
      {label}
    </span>
  );
}

function PDFFrame({ src, title }: { src: string; title: string }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Loading document...
            </span>
          </div>
        </div>
      )}
      <iframe
        src={src}
        className="w-full h-full border-0"
        title={title}
        onLoad={() => setIsLoading(false)}
      />
    </>
  );
}

export default function PDFViewerModal({
  isOpen,
  onClose,
  url,
  title,
  pageNumber,
  notebook,
  onFindSimilar,
  onFlagIssue,
}: PDFViewerModalProps) {
  // Handle escape key & lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Build the proxied URL
  const getPdfUrl = () => {
    const proxiedUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
    if (pageNumber && pageNumber > 1) {
      return `${proxiedUrl}#page=${pageNumber}`;
    }
    return proxiedUrl;
  };

  const handleDownload = () => {
    const downloadUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = title || "document.pdf";
    a.click();
  };

  const handleOpenExternal = () => {
    let externalUrl = url;
    if (externalUrl.startsWith("gs://")) {
      externalUrl = `https://storage.cloud.google.com/${externalUrl.slice(5)}`;
    }
    window.open(externalUrl, "_blank");
  };

  const pdfUrl = getPdfUrl();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Full-screen Modal */}
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative flex flex-col w-full h-full bg-white dark:bg-gray-900 shadow-2xl z-10 overflow-hidden"
          >
            {/* ── Header ──────────────────────────────────────────── */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b 
              border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex-shrink-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {title || "Document Viewer"}
                </h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleOpenExternal}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                    text-gray-500 dark:text-gray-400 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                    text-gray-500 dark:text-gray-400 transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 
                    text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Content Area: PDF + Side Panels ─────────────────── */}
            <div className="flex-1 flex min-h-0">
              {/* PDF Viewer (left) */}
              <div className="flex-1 relative bg-gray-200 dark:bg-gray-950 min-w-0">
                <PDFFrame
                  key={pdfUrl}
                  src={pdfUrl}
                  title={title}
                />
              </div>

              {/* Side Panels (right) */}
              <div
                className={cn(
                  "w-[380px] flex-shrink-0 border-l border-gray-200 dark:border-gray-700",
                  "bg-white dark:bg-gray-900 flex flex-col overflow-hidden"
                )}
              >
                {/* Scrollable panel content */}
                <div className="flex-1 overflow-y-auto">
                  {/* ── Metadata Section ──────────────────────── */}
                  <PanelSection
                    title="Metadata"
                    icon={<Tag className="w-4 h-4 text-blue-500" />}
                  >
                    <div className="space-y-1">
                      <DetailRow
                        label="Title"
                        value={notebook?.title || title}
                        icon={<FileText className="w-3.5 h-3.5" />}
                      />
                      <DetailRow
                        label="Author"
                        value={notebook?.author}
                        icon={<User className="w-3.5 h-3.5" />}
                      />
                      <DetailRow
                        label="Date"
                        value={notebook?.date}
                        icon={<Calendar className="w-3.5 h-3.5" />}
                      />
                      {notebook?.description && (
                        <DetailRow
                          label="Description"
                          value={notebook.description}
                        />
                      )}
                      {notebook?.tags && notebook.tags.length > 0 && (
                        <div className="pt-1.5">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
                            Tags
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {notebook.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </PanelSection>

                  {/* ── Reactions Section ─────────────────────── */}
                  <PanelSection
                    title="Reactions"
                    icon={<FlaskConical className="w-4 h-4 text-emerald-500" />}
                  >
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
                          Product
                        </span>
                        <PlaceholderPill label="No products extracted yet" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
                          Reagent
                        </span>
                        <PlaceholderPill label="No reagents extracted yet" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
                          Reactant
                        </span>
                        <PlaceholderPill label="No reactants extracted yet" />
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                        Reaction data will be populated when extraction is available
                      </p>
                    </div>
                  </PanelSection>

                  {/* ── Procedure / Reaction Conditions ────────── */}
                  <PanelSection
                    title="Procedure / Reaction Conditions"
                    icon={<Beaker className="w-4 h-4 text-amber-500" />}
                    defaultOpen={false}
                  >
                    <div className="space-y-2">
                      <PlaceholderPill label="No procedures extracted yet" />
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                        Procedure details and reaction conditions will appear here once extraction is available
                      </p>
                    </div>
                  </PanelSection>
                </div>

                {/* ── Action Buttons (bottom of side panel) ───── */}
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                  <button
                    onClick={() => notebook && onFindSimilar?.(notebook)}
                    disabled={!notebook}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium 
                      rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors 
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Search className="w-4 h-4" />
                    Find Similar
                  </button>
                  <button
                    onClick={() => notebook && onFlagIssue?.(notebook)}
                    disabled={!notebook}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium 
                      rounded-lg border border-gray-300 dark:border-gray-600 
                      text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 
                      transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Flag Something Wrong
                  </button>
                </div>
              </div>
            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            <div
              className="px-5 py-1.5 border-t border-gray-200 dark:border-gray-700 
              bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between flex-shrink-0"
            >
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Use the PDF toolbar to navigate pages, zoom, and search • Esc to close
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-4">
                {title}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
