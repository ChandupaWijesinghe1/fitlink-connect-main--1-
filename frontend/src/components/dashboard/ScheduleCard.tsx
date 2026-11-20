import { Card } from "@/components/ui/card";
import { CalendarDays, ChevronRight, Dumbbell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleCardProps {
  id: string;
  title: string;
  description: string;
  numberOfDays: number;
  exerciseCount?: number;
  owner: string;
  isOwnSchedule: boolean;
  createdAt?: string;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value.trim());

const formatCreated = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const ScheduleCard = ({
  id,
  title,
  description,
  numberOfDays,
  exerciseCount = 0,
  owner,
  isOwnSchedule,
  createdAt,
  onClick,
  onDelete,
}: ScheduleCardProps) => {
  const days = Math.max(0, numberOfDays);
  const createdLabel = formatCreated(createdAt);
  const sourceLabel = isOwnSchedule
    ? "Your plan"
    : owner && !isObjectId(owner)
      ? owner
      : "From trainer";

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <Card
      className="cursor-pointer p-4 transition active:scale-[0.99] hover:border-primary/40"
      onClick={() => onClick(id)}
    >
      <div className="flex items-start gap-3">
        <div className="icon-chip shrink-0">
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{sourceLabel}</p>
              <h3 className="truncate font-heading text-base text-foreground">{title}</h3>
            </div>
            {isOwnSchedule && onDelete ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                aria-label="Delete schedule"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {description || "A workout plan you can follow day by day."}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
              {days} {days === 1 ? "day" : "days"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
              <Dumbbell className="h-3 w-3 text-primary" />
              {exerciseCount}
            </span>
            <span className="ml-auto">
              {createdLabel ? createdLabel : "Open"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ScheduleCard;
