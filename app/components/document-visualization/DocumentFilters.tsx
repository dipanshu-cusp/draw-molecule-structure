import { NotebookFilters } from "@/app/types/chat";
import { Calendar, Tag, User, X } from "lucide-react";

interface DocumentFiltersProps {
  filters: NotebookFilters;
  onFilterChange: (field: keyof NotebookFilters, value: string) => void;
}

interface FilterTagProps {
  icon: React.ReactNode;
  label: string;
  onRemove: () => void;
}

export const DocumentFilters = ({
  filters,
  onFilterChange,
}: DocumentFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.author && (
        <FilterTag
          icon={<User className="w-3 h-3" />}
          label={`Author: ${filters.author}`}
          onRemove={() => onFilterChange("author", "")}
        />
      )}
      {filters.dateFrom && (
        <FilterTag
          icon={<Calendar className="w-3 h-3" />}
          label={`From: ${filters.dateFrom}`}
          onRemove={() => onFilterChange("dateFrom", "")}
        />
      )}
      {filters.dateTo && (
        <FilterTag
          icon={<Calendar className="w-3 h-3" />}
          label={`To: ${filters.dateTo}`}
          onRemove={() => onFilterChange("dateTo", "")}
        />
      )}
      {filters.search && (
        <FilterTag
          icon={<Tag className="w-3 h-3" />}
          label={`"${filters.search}"`}
          onRemove={() => onFilterChange("search", "")}
        />
      )}
    </div>
  );
};

export const FilterTag = ({ icon, label, onRemove }: FilterTagProps) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full 
                    bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border 
                    border-blue-200 dark:border-blue-800">
      {icon}
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
};
