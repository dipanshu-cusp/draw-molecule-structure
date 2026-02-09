import { formatRelativeTime } from "@/app/lib/utils";
import { RecentDocument } from "@/app/types/chat";
import { Clock, FileText, Trash2 } from "lucide-react";

interface RecentDocumentsProps {
  docs: RecentDocument[];
  onOpenRecent: (doc: RecentDocument) => void;
  onClearRecentDocs: () => void;
}

const RecentDocuments = ({
  docs,
  onOpenRecent,
  onClearRecentDocs,
}: RecentDocumentsProps) => {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Open recently
          </h3>
        </div>
        {docs.length > 0 && (
          <button
            onClick={onClearRecentDocs}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
            title="Clear recent documents"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {docs.length > 0 ? (
          <div className="space-y-1">
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onOpenRecent(doc)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 group-hover:text-blue-500 transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.author && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                          {doc.author}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-300 dark:text-gray-600">
                        {formatRelativeTime(doc.openedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <Clock className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No recent documents
            </p>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-tight">
          📌 Recent documents are stored locally in your browser and are not
          persisted across devices
        </p>
      </div>
    </aside>
  );
};

export default RecentDocuments;
