import { Message } from "@/app/types/chat";
import {
    ExternalLink
} from "lucide-react";

interface SourceAndReferencesProps {
  message: Message;
}

const SourceAndReferences = ({ message }: SourceAndReferencesProps) => {
  if (
    !message.metadata?.references ||
    message.metadata.references.length === 0
  ) {
    return;
  }

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
        <ExternalLink className="w-3.5 h-3.5" />
        <span className="font-medium">Sources</span>
      </div>
      <div className="space-y-2">
        {message.metadata.references.slice(0, 5).map((ref, index) => (
          <div
            key={index}
            className="text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 
                    border border-gray-200 dark:border-gray-700"
          >
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
              [{index + 1}] {ref.title || "Source Document"}
            </div>
            {ref.content && (
              <p className="text-gray-500 dark:text-gray-400 line-clamp-2">
                {ref.content.substring(0, 200)}...
              </p>
            )}
            {ref.uri && (
              <a
                href={
                  ref.uri.startsWith("gs://")
                    ? `https://storage.cloud.google.com/${ref.uri.slice(5)}`
                    : ref.uri
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 
                        dark:hover:text-blue-300 inline-flex items-center gap-1 mt-1"
              >
                View source <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourceAndReferences;
