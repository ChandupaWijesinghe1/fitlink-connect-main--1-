import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCheck, Loader2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ThemeToggle";

export interface ChatListItem {
  id: string;
  name: string;
  image?: string;
  preview?: string;
  time?: string;
  unreadCount?: number;
  sentByMe?: boolean;
}

interface ChatListProps {
  items: ChatListItem[];
  selectedId?: string;
  isLoading?: boolean;
  emptyText: string;
  onSelect: (id: string) => void;
  onBack: () => void;
}

type Filter = "all" | "unread";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const formatListTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return minutes === 1 ? "1 min" : `${minutes} mins`;
  if (hours < 24) return hours === 1 ? "1 hr" : `${hours} hrs`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const iconButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted";

const ChatList = ({
  items,
  selectedId,
  isLoading = false,
  emptyText,
  onSelect,
  onBack,
}: ChatListProps) => {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const visible = items.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === "all" || (item.unreadCount || 0) > 0;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <h1 className="min-w-0 flex-1 font-heading text-3xl text-foreground">Chats</h1>
          <button
            type="button"
            aria-label={searchOpen ? "Close search" : "Search chats"}
            aria-pressed={searchOpen}
            onClick={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setQuery("");
            }}
            className={iconButtonClass}
          >
            <Search className="h-4 w-4" />
          </button>
          <ThemeToggle className="h-10 w-10 border-border bg-card shadow-sm" />
          <button type="button" onClick={onBack} aria-label="Back to dashboard" className={iconButtonClass}>
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        {searchOpen ? (
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            className="mt-3 h-11 w-full rounded-full border border-border bg-card px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-20 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto px-4 py-3">
              {(["all", "unread"] as Filter[]).map((value) => {
                const active = filter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/70"
                    }`}
                  >
                    {value === "all" ? "All" : "Unread"}
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <p className="px-4 py-16 text-center text-sm text-muted-foreground">
                {filter === "unread" ? "No unread chats" : "No chats match that search"}
              </p>
            ) : (
              <ul>
                {visible.map((item) => {
                  const unread = item.unreadCount || 0;
                  const active = item.id === selectedId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          active ? "bg-primary/10" : "hover:bg-muted/50"
                        }`}
                      >
                        <Avatar className={`h-12 w-12 ring-2 ${unread > 0 ? "ring-primary" : "ring-border"}`}>
                          {item.image ? <AvatarImage src={item.image} alt="" /> : null}
                          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-accent text-sm font-semibold text-primary-foreground">
                            {initials(item.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="truncate font-semibold text-foreground">{item.name}</span>
                            <span className={`shrink-0 text-xs ${unread > 0 ? "text-primary" : "text-muted-foreground"}`}>
                              {formatListTime(item.time)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                              {item.sentByMe ? <CheckCheck className="h-3.5 w-3.5 shrink-0 text-accent" /> : null}
                              <span className="truncate">{item.preview || "No messages yet"}</span>
                            </span>
                            {unread > 0 ? (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                                {unread}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatList;
