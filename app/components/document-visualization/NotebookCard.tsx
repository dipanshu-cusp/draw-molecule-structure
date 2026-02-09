import { User, Calendar, FileText } from "lucide-react";
import { NotebookMetadata } from "@/app/types/chat";

interface NotebookCardProps {
  notebook: NotebookMetadata;
  onView: (notebook: NotebookMetadata) => void;
}

const NotebookCard = ({ notebook, onView }: NotebookCardProps) => {
  return (
    <button
      onClick={() => onView(notebook)}
      className="w-full text-left p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 
        dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 
        hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {notebook.title}
          </h3>
          {notebook.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {notebook.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {notebook.author && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <User className="w-3 h-3" />
                {notebook.author}
              </span>
            )}
            {notebook.date && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Calendar className="w-3 h-3" />
                {notebook.date}
              </span>
            )}
            {notebook.tags &&
              notebook.tags.length > 0 &&
              notebook.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
          </div>
        </div>
      </div>
    </button>
  );
};

export default NotebookCard;
