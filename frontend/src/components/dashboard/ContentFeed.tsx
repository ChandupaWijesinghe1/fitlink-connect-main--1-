import { useMemo, useState } from "react";
import { Globe, Loader2, MessageCircle, MoreHorizontal, Send, Share2, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

export interface FeedTrainer {
  _id?: string;
  name?: string;
  specialization?: string;
  profileImage?: string;
}

export interface FeedPost {
  _id: string;
  image?: string;
  caption?: string;
  createdAt?: string;
  trainer?: FeedTrainer;
}

export interface FeedStory {
  _id: string;
  name?: string;
  profileImage?: string;
  cover?: string;
}

interface ContentFeedProps {
  posts: FeedPost[];
  stories?: FeedStory[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenProfile?: (trainerId: string) => void;
}

const CAPTION_LIMIT = 150;

function formatPostTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function initials(name?: string) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "T";
}

function FeedPostCard({
  post,
  onOpenProfile,
}: {
  post: FeedPost;
  onOpenProfile?: (trainerId: string) => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<{ id: string; author: string; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const caption = post.caption?.trim() || "";
  const isLong = caption.length > CAPTION_LIMIT;
  const visibleCaption = expanded || !isLong ? caption : `${caption.slice(0, CAPTION_LIMIT).trimEnd()}...`;
  const trainerId = post.trainer?._id;
  const trainerName = post.trainer?.name || "Trainer";

  const openProfile = () => {
    if (trainerId && onOpenProfile) onOpenProfile(trainerId);
  };

  const submitComment = () => {
    const text = draft.trim();
    if (!text) return;
    setComments((current) => [
      ...current,
      { id: `${Date.now()}`, author: user?.name || "You", text },
    ]);
    setDraft("");
    setShowComments(true);
  };

  const sharePost = async () => {
    const text = caption ? `${trainerName}: ${caption}` : `${trainerName} shared a post on FitConnect`;
    try {
      if (navigator.share) {
        await navigator.share({ title: trainerName, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Post copied");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      toast.error("Could not share this post");
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-2.5 px-3 py-2.5 md:px-4 md:py-3">
        <button type="button" onClick={openProfile} className="shrink-0 rounded-full" aria-label={`${trainerName} profile`}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.trainer?.profileImage || ""} alt={trainerName} />
            <AvatarFallback className="bg-primary/15 text-primary">{initials(trainerName)}</AvatarFallback>
          </Avatar>
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={openProfile} className="block max-w-full truncate text-left text-[15px] font-semibold leading-5 text-foreground hover:underline">
            {trainerName}
          </button>
          <p className="flex items-center gap-1 text-[13px] leading-4 text-muted-foreground">
            <span>{formatPostTime(post.createdAt) || "Recently"}</span>
            <span aria-hidden>·</span>
            <Globe className="h-3 w-3" />
            {post.trainer?.specialization ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{post.trainer.specialization}</span>
              </>
            ) : null}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Post options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="cursor-pointer" onClick={openProfile} disabled={!trainerId}>
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={sharePost}>
              Copy post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {caption ? (
        <p className="px-3 pb-2.5 text-[15px] leading-5 text-foreground md:px-4">
          {visibleCaption}{" "}
          {isLong ? (
            <button
              type="button"
              className="font-semibold text-muted-foreground hover:underline"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "See less" : "See more"}
            </button>
          ) : null}
        </p>
      ) : null}

      {post.image ? (
        <button type="button" className="block w-full bg-muted" onClick={() => setPhotoOpen(true)} aria-label="Open photo">
          <img
            src={post.image}
            alt={caption || `${trainerName} post`}
            className="max-h-[420px] w-full object-cover md:max-h-[520px]"
          />
        </button>
      ) : null}

      {(liked || comments.length > 0) && (
        <div className="flex items-center justify-between px-3 py-2 text-[13px] text-muted-foreground md:px-4">
          <span className="flex items-center gap-1.5">
            {liked ? (
              <>
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ThumbsUp className="h-2.5 w-2.5 fill-current" />
                </span>
                You
              </>
            ) : null}
          </span>
          {comments.length > 0 ? (
            <button type="button" className="hover:underline" onClick={() => setShowComments(true)}>
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </button>
          ) : null}
        </div>
      )}

      <div className="mx-3 grid grid-cols-3 border-t border-border/80 py-1 md:mx-4">
        <button
          type="button"
          onClick={() => setLiked((value) => !value)}
          className={`flex items-center justify-center gap-2 rounded-md py-2 text-[14px] font-semibold hover:bg-muted md:text-[15px] ${
            liked ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <ThumbsUp className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} />
          Like
        </button>
        <button
          type="button"
          onClick={() => setShowComments((value) => !value)}
          className="flex items-center justify-center gap-2 rounded-md py-2 text-[14px] font-semibold text-muted-foreground hover:bg-muted md:text-[15px]"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          Comment
        </button>
        <button
          type="button"
          onClick={sharePost}
          className="flex items-center justify-center gap-2 rounded-md py-2 text-[14px] font-semibold text-muted-foreground hover:bg-muted md:text-[15px]"
        >
          <Share2 className="h-[18px] w-[18px]" />
          Share
        </button>
      </div>

      {showComments ? (
        <div className="space-y-3 px-3 pb-3 md:px-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-xs">{initials(comment.author)}</AvatarFallback>
              </Avatar>
              <div className="rounded-2xl bg-muted px-3 py-2">
                <p className="text-[13px] font-semibold leading-4">{comment.author}</p>
                <p className="text-[14px] leading-5 text-foreground">{comment.text}</p>
              </div>
            </div>
          ))}
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitComment();
            }}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/15 text-xs text-primary">
                {initials(user?.name || "You")}
              </AvatarFallback>
            </Avatar>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a comment..."
              className="h-9 min-w-0 flex-1 rounded-full bg-muted px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-primary disabled:opacity-40"
              aria-label="Send comment"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      {photoOpen && post.image ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3 md:p-8"
          onClick={() => setPhotoOpen(false)}
          role="presentation"
        >
          <button
            type="button"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setPhotoOpen(false)}
            aria-label="Close photo"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={post.image}
            alt={caption || `${trainerName} post`}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </article>
  );
}

const ContentFeed = ({
  posts,
  stories,
  isLoading = false,
  emptyTitle = "No contents yet",
  emptyDescription = "Trainers have not posted yet.",
  onOpenProfile,
}: ContentFeedProps) => {
  const people = useMemo(() => {
    const coverByTrainer = new Map<string, string>();
    posts.forEach((post) => {
      const id = post.trainer?._id;
      if (id && post.image && !coverByTrainer.has(id)) coverByTrainer.set(id, post.image);
    });

    const derived = posts.reduce<FeedStory[]>((list, post) => {
      const id = post.trainer?._id;
      if (!id || list.some((person) => person._id === id)) return list;
      list.push({
        _id: id,
        name: post.trainer?.name,
        profileImage: post.trainer?.profileImage,
      });
      return list;
    }, []);
    const source = stories !== undefined ? stories : derived;

    return source.slice(0, 12).map((person) => ({
      ...person,
      cover: person.cover || coverByTrainer.get(person._id) || person.profileImage || "",
    }));
  }, [posts, stories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading contents...</span>
      </div>
    );
  }

  return (
    <div className="-mx-4 w-[calc(100%+2rem)] space-y-2 md:mx-auto md:w-full md:max-w-[680px] md:space-y-4">
      {people.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card py-3">
          <div className="flex gap-2 overflow-x-auto px-3 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden">
            {people.map((person) => (
              <button
                key={person._id}
                type="button"
                onClick={() => onOpenProfile?.(person._id)}
                className="relative h-44 w-[108px] shrink-0 snap-start overflow-hidden rounded-xl md:h-[200px] md:w-[128px]"
              >
                {person.cover ? (
                  <img src={person.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/75" />
                <Avatar className="absolute left-2 top-2 h-9 w-9 ring-[3px] ring-primary">
                  <AvatarImage src={person.profileImage || ""} alt={person.name || "Trainer"} />
                  <AvatarFallback className="bg-card text-sm text-primary">{initials(person.name)}</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-2 left-2 right-2 line-clamp-2 text-left text-xs font-semibold text-white">
                  {person.name || "Trainer"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <h3 className="text-lg font-semibold text-foreground">{emptyTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      ) : (
        posts.map((post) => <FeedPostCard key={post._id} post={post} onOpenProfile={onOpenProfile} />)
      )}
    </div>
  );
};

export default ContentFeed;
