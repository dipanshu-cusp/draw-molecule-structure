import { Message } from "@/app/types/chat";
import { FileText, ChevronRight } from "lucide-react";

interface SourceAndReferencesProps {
  message: Message;
  onShowSources?: () => void;
}

const SourceAndReferences = ({
  message,
  onShowSources,
}: SourceAndReferencesProps) => {
  if (
    !message.metadata?.references ||
    message.metadata.references.length === 0
  ) {
    return null;
  }

  const referenceCount = message.metadata.references.length;

  return (
    <div className="mt-3 w-full">
      <button
        onClick={onShowSources}
        className="group flex items-center gap-2 px-3 py-2 text-sm rounded-lg 
          bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 
          hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 
          dark:hover:bg-blue-900/20 transition-all text-gray-700 dark:text-gray-300"
      >
        <FileText className="w-4 h-4 text-blue-500" />
        <span className="font-medium">
          Show {referenceCount} source{referenceCount !== 1 ? "s" : ""}
        </span>
        <ChevronRight
          className="w-4 h-4 text-gray-400 group-hover:text-blue-500 
            group-hover:translate-x-0.5 transition-all"
        />
      </button>
    </div>
  );
};

export default SourceAndReferences;
