import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Calendar, Dumbbell, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleCardProps {
  id: string;
  title: string;
  description: string;
  numberOfDays: number;
  exerciseCount?: number;
  owner: string;
  isOwnSchedule: boolean;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ScheduleCard = ({
  id,
  title,
  description,
  numberOfDays,
  exerciseCount,
  owner,
  isOwnSchedule,
  onClick,
  onDelete,
}: ScheduleCardProps) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card
        className="group cursor-pointer overflow-hidden rounded-3xl border-border/70 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
        onClick={() => onClick(id)}
      >
        <CardContent className="p-0">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-heading text-foreground group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {description || "Workout plan"}
                </p>
              </div>
              {isOwnSchedule && onDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {numberOfDays} {numberOfDays === 1 ? "day" : "days"}
              </span>
              {exerciseCount != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  <Dumbbell className="h-3.5 w-3.5 text-accent" />
                  {exerciseCount} exercises
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {isOwnSchedule ? "Created by you" : owner || "Trainer plan"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ScheduleCard;
