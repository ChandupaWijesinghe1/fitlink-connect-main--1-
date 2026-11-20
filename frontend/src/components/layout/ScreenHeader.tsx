import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}

const ScreenHeader = ({ title, onBack, action }: ScreenHeaderProps) => (
  <div className="flex items-center gap-3 px-5 py-4">
    {onBack ? (
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
    ) : null}
    <h1 className="min-w-0 flex-1 truncate font-heading text-xl font-bold text-foreground">{title}</h1>
    {action}
  </div>
);

export default ScreenHeader;
