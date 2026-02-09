import { motion } from "framer-motion";
import { FileText, Loader2, BookOpen } from "lucide-react";
import NotebookCard from "./NotebookCard";
import { NotebookMetadata } from "@/app/types/chat";

interface ResultsProps {
  loading: boolean;
  notebooks: NotebookMetadata[];
  hasSearched: boolean;
  onViewDocument: (notebook: NotebookMetadata) => void;
}

const NotebookResults = ({
  loading,
  notebooks,
  hasSearched,
  onViewDocument,
}: ResultsProps) => {
  return (
    <div className="flex-1">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Searching notebooks...
            </span>
          </div>
        </div>
      ) : notebooks.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Found {notebooks.length} notebook{notebooks.length !== 1 && "s"}
          </p>
          {notebooks.map((notebook, index) => (
            <motion.div
              key={notebook.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <NotebookCard notebook={notebook} onView={onViewDocument} />
            </motion.div>
          ))}
        </div>
      ) : hasSearched ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            No notebooks found
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Try adjusting your filters or search terms
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Use the filters above to find notebooks
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Search by author, date range, or keywords
          </p>
        </div>
      )}
    </div>
  );
};

export default NotebookResults;