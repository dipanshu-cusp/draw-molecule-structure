"use client";

import { motion } from "framer-motion";
import { Search, BookOpen } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { AppMode } from "@/app/types/chat";

interface ModeSwitcherProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  className?: string;
}

const modes: { value: AppMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "search",
    label: "Search",
    icon: <Search className="w-4 h-4" />,
    description: "Ask questions & draw structures",
  },
  {
    value: "documents",
    label: "Documents",
    icon: <BookOpen className="w-4 h-4" />,
    description: "Browse & filter notebooks",
  },
];

export default function ModeSwitcher({
  mode,
  onModeChange,
  className,
}: ModeSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onModeChange(m.value)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            mode === m.value
              ? "text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          {mode === m.value && (
            <motion.div
              layoutId="mode-switcher-bg"
              className="absolute inset-0 bg-blue-600 rounded-lg"
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {m.icon}
            {m.label}
          </span>
        </button>
      ))}
    </div>
  );
}
