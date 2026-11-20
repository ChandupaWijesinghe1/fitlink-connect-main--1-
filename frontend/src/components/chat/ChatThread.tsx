import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, Calendar, Check, CheckCheck, Copy, Loader2, MoreHorizontal, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export interface ChatThreadMessage {
  _id: string;
  sender: {
    id: string;
    name: string;
    type: string;
  };
  message: string;
  messageType: string;
  scheduleId?: string;
  scheduleData?: {
    title: string;
    days: number;
  };
  isRead: boolean;
  createdAt: string;
}

interface ChatThreadProps {
  title: string;
  subtitle?: string;
  messages: ChatThreadMessage[];
  currentUserId?: string;
  isLoading?: boolean;
  isSending?: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onBack: () => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  formatTime: (value: string) => string;
  onOpenSchedule?: (scheduleId: string) => void;
  menuLabel?: string;
  onMenu?: () => void;
  leadingAction?: ReactNode;
  emptyText: string;
}

const iconButtonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted";

const ChatThread = ({
  title,
  subtitle,
  messages,
  currentUserId,
  isLoading = false,
  isSending = false,
  draft,
  onDraftChange,
  onSend,
  onBack,
  onTyping,
  onStopTyping,
  formatTime,
  onOpenSchedule,
  menuLabel,
  onMenu,
  leadingAction,
  emptyText,
}: ChatThreadProps) => {
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isLoading]);

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Message copied" });
    } catch {
      toast({ title: "Couldn't copy", description: "Copy this message manually", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="flex items-center gap-3 px-3 py-3">
        <button type="button" onClick={onBack} aria-label="Back" className={iconButtonClass}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="max-w-[16rem] rounded-full border border-border bg-card px-4 py-2 text-center shadow-sm">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            {subtitle ? <p className="truncate text-[11px] font-medium text-accent">{subtitle}</p> : null}
          </div>
        </div>
        {onMenu && menuLabel ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More" className={iconButtonClass}>
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onMenu}>{menuLabel}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="h-10 w-10" />
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(hsl(var(--muted-foreground)/0.28)_1px,transparent_1px)] bg-[length:18px_18px] px-4 py-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((message) => {
              const mine = String(message.sender.id) === String(currentUserId || "");
              const time = formatTime(message.createdAt);

              if (message.messageType === "schedule") {
                return (
                  <div key={message._id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div className="max-w-[85%] rounded-[22px] border border-border bg-card px-4 py-3 shadow-sm">
                      {!mine ? (
                        <p className="text-sm font-semibold text-accent">{message.sender.name}</p>
                      ) : null}
                      <div className="mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-accent" />
                        <p className="font-semibold text-foreground">
                          {message.scheduleData?.title || "Workout plan"}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {message.scheduleData?.days || 0} days
                      </p>
                      {message.scheduleId && onOpenSchedule ? (
                        <button
                          type="button"
                          onClick={() => onOpenSchedule(message.scheduleId!)}
                          className="mt-3 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent"
                        >
                          View plan
                        </button>
                      ) : null}
                    </div>
                    <MessageTime mine={mine} time={time} read={mine ? message.isRead : undefined} />
                  </div>
                );
              }

              if (mine) {
                return (
                  <div key={message._id} className="flex flex-col items-end">
                    <div className="max-w-[85%] rounded-[22px] rounded-br-md bg-primary px-4 py-3 text-primary-foreground shadow-sm">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.message}</p>
                    </div>
                    <MessageTime mine time={time} read={message.isRead} />
                  </div>
                );
              }

              return (
                <div key={message._id} className="flex flex-col items-start">
                  <div className="max-w-[85%] rounded-[22px] rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-accent">{message.sender.name}</p>
                      <button
                        type="button"
                        onClick={() => copyMessage(message.message)}
                        aria-label="Copy message"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                      {message.message}
                    </p>
                  </div>
                  <MessageTime time={time} />
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        className="px-3 pb-3 pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-1 rounded-full border border-border bg-card px-2 py-1.5 shadow-sm">
          {leadingAction}
          <input
            value={draft}
            onChange={(event) => {
              onDraftChange(event.target.value);
              onTyping?.();
            }}
            onBlur={() => onStopTyping?.()}
            placeholder="Message..."
            disabled={isSending}
            className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || isSending}
            aria-label="Send message"
            className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
};

const MessageTime = ({ mine, time, read }: { mine?: boolean; time: string; read?: boolean }) => (
  <span className={`mt-1 flex items-center gap-1 text-[11px] text-muted-foreground ${mine ? "pr-1" : "pl-1"}`}>
    {time}
    {mine ? (read ? <CheckCheck className="h-3.5 w-3.5 text-accent" /> : <Check className="h-3.5 w-3.5" />) : null}
  </span>
);

export default ChatThread;
