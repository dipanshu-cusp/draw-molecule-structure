import { Message } from "@/app/types/chat";
import { MessageCircleQuestion } from "lucide-react";

interface SuggestionsProps {
  message: Message;
  onRelatedQuestionClick?: (question: string) => void;
}

export default function Suggestions({
  message,
  onRelatedQuestionClick,
}: SuggestionsProps) {
  if (
    !message.metadata?.relatedQuestions ||
    message.metadata.relatedQuestions.length === 0
  ) {
    return;
  }

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
        <MessageCircleQuestion className="w-3.5 h-3.5" />
        <span className="font-medium">Related Questions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {message.metadata.relatedQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => onRelatedQuestionClick?.(question)}
            className="text-xs px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 
                    text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 
                    transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
