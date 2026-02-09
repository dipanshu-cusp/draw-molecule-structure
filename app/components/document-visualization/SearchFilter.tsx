import { NotebookFilters } from "@/app/types/chat";
import { motion } from "framer-motion";
import { Calendar, ChevronDown, Loader2, Search, User, X } from "lucide-react";

interface SearchFilterProps {
  loading: boolean;
  filters: NotebookFilters;
  authors: string[];
  activeFilterCount: number;
  fetchNotebooks: () => void;
  clearFilters: () => void;
  onFilterChange: (field: keyof NotebookFilters, value: string) => void;
}

const SearchFilter = ({
  loading,
  filters,
  authors,
  activeFilterCount,
  fetchNotebooks,
  clearFilters,
  onFilterChange,
}: SearchFilterProps) => {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
        {/* Search */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            <Search className="w-3.5 h-3.5" />
            Keyword Search
          </label>
          <input
            type="text"
            value={filters.search || ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Search by title or content..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 
                      bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white 
                      placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                      outline-none transition-all"
          />
        </div>

        {/* Author & Date row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Author */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              <User className="w-3.5 h-3.5" />
              Author
            </label>
            <div className="relative">
              <select
                value={filters.author || ""}
                onChange={(e) => onFilterChange("author", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 
                          bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white 
                          focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                          outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">All Authors</option>
                {authors.map((author) => (
                  <option key={author} value={author}>
                    {author}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => onFilterChange("dateFrom", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 
                        bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white 
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                        outline-none transition-all"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => onFilterChange("dateTo", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 
                        bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white 
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                        outline-none transition-all"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={fetchNotebooks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg 
                      bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search Notebooks
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 
                        hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SearchFilter;
