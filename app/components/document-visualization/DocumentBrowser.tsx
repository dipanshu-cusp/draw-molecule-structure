"use client";

import { MAX_RECENT_DOCS, RECENT_DOCS_KEY } from "@/app/lib/constants";
import { cn } from "@/app/lib/utils";
import {
  NotebookFilters,
  NotebookMetadata,
  RecentDocument,
} from "@/app/types/chat";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronDown, Filter } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DocumentFilters } from "./DocumentFilters";
import NotebookResults from "./NotebookResults";
import RecentDocuments from "./RecentDocuments";
import SearchFilter from "./SearchFilter";

// LocalStorage helpers
function getRecentDocs(): RecentDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentDocs(docs: RecentDocument[]) {
  try {
    localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(docs));
  } catch {
    console.error("storage full or unavailable");
  }
}

export function addRecentDocument(notebook: NotebookMetadata) {
  const docs = getRecentDocs().filter((d) => d.id !== notebook.id);
  const newDoc: RecentDocument = {
    id: notebook.id,
    title: notebook.title,
    gcsPath: notebook.gcsPath,
    author: notebook.author,
    date: notebook.date,
    openedAt: new Date().toISOString(),
  };
  const updated = [newDoc, ...docs].slice(0, MAX_RECENT_DOCS);
  saveRecentDocs(updated);
  return updated;
}

interface DocumentBrowserProps {
  onViewDocument: (notebook: NotebookMetadata) => void;
}

export default function DocumentBrowser({
  onViewDocument,
}: DocumentBrowserProps) {
  const [notebooks, setNotebooks] = useState<NotebookMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authors, setAuthors] = useState<string[]>([]);
  const [filters, setFilters] = useState<NotebookFilters>({});
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);

  // Load recent docs from localStorage
  useEffect(() => {
    setRecentDocs(getRecentDocs());
  }, []);

  useEffect(() => {
    fetchAuthors();
  }, []);

  const fetchAuthors = async () => {
    try {
      const res = await fetch("/api/notebooks/authors");
      if (res.ok) {
        const data = await res.json();
        setAuthors(data.authors || []);
      }
    } catch (error) {
      console.error("Authors will remain empty; filters still usable", error);
    }
  };

  const fetchNotebooks = useCallback(async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (filters.author) params.set("author", filters.author);
      if (filters.dateFrom) params.set("date_from", filters.dateFrom);
      if (filters.dateTo) params.set("date_to", filters.dateTo);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/notebooks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotebooks(data.notebooks || []);
      }
    } catch {
      setNotebooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key: keyof NotebookFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setNotebooks([]);
    setHasSearched(false);
  };

  const handleViewDoc = (notebook: NotebookMetadata) => {
    const updated = addRecentDocument(notebook);
    setRecentDocs(updated);
    onViewDocument(notebook);
  };

  const handleClearRecentDocs = () => {
    saveRecentDocs([]);
    setRecentDocs([]);
  };

  const handleOpenRecent = (doc: RecentDocument) => {
    const notebook: NotebookMetadata = {
      id: doc.id,
      title: doc.title,
      gcsPath: doc.gcsPath,
      author: doc.author,
      date: doc.date,
    };
    const updated = addRecentDocument(notebook);
    setRecentDocs(updated);
    onViewDocument(notebook);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex-1 flex min-h-0">
      <RecentDocuments
        docs={recentDocs}
        onOpenRecent={handleOpenRecent}
        onClearRecentDocs={handleClearRecentDocs}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6 min-w-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Document Browser
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Browse and filter research notebooks by author, date, or keyword
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          {/* Filter header */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filters
              </span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-gray-400 transition-transform",
                isFilterOpen && "rotate-180",
              )}
            />
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <SearchFilter
                authors={authors}
                filters={filters}
                onFilterChange={handleFilterChange}
                clearFilters={clearFilters}
                loading={isLoading}
                fetchNotebooks={fetchNotebooks}
                activeFilterCount={activeFilterCount}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Active filter tags */}
        {activeFilterCount > 0 && (
          <DocumentFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        )}

        <NotebookResults
          loading={isLoading}
          notebooks={notebooks}
          hasSearched={hasSearched}
          onViewDocument={handleViewDoc}
        />
      </div>
    </div>
  );
}
