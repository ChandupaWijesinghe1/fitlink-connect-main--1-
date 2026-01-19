import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Bell, MessageCircle, UserPlus, CheckCircle, Trash2, Settings, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  getAllNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  acceptConnectionFromNotification,
  declineConnectionFromNotification
} from "@/api/notifications"; 

interface Notification {
  _id: string;
  type: "message" | "connection" | "connection_accepted" | "connection_declined" | "schedule" | "system";
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  sender?: {
    id: string;
    type: string;
    name: string;
    profileImage?: string;
  };
  actionUrl?: string;
  metadata?: {
    requestId?: string;
    scheduleId?: string;
    messageId?: string;
  };
  recipient?: {
    id: string;
    type: string;
  };
}

const Notifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isTrainer = location.pathname.includes("trainer");
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await getAllNotifications();
      
      console.log('Fetched notifications:', data); // Debug log
      
      // Handle both response formats
      const notificationsList = data.notifications || data.data || [];
      setNotifications(notificationsList);
      
      // Count unread
      const count = notificationsList.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(count);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      if (error.response?.status === 401) {
        toast.error("Please log in to view notifications");
        navigate(isTrainer ? "/trainer/login" : "/login");
      } else {
        toast.error(error.response?.data?.message || "Failed to load notifications");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unread count separately
  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchNotifications();
    } else {
      setIsLoading(false);
      toast.error("Please log in to view notifications");
    }
  }, [user?._id]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "message":
        return <MessageCircle className="h-5 w-5" />;
      case "connection":
      case "connection_accepted":
      case "connection_declined":
        return <UserPlus className="h-5 w-5" />;
      case "schedule":
        return <Bell className="h-5 w-5" />;
      case "system":
        return <Bell className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "message":
        return "from-blue-500 to-cyan-500";
      case "connection":
        return "from-purple-500 to-pink-500";
      case "connection_accepted":
        return "from-green-500 to-emerald-500";
      case "connection_declined":
        return "from-red-500 to-orange-500";
      case "schedule":
        return "from-orange-500 to-yellow-500";
      case "system":
        return "from-emerald-500 to-teal-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking as read:', error);
      toast.error(error.response?.data?.message || "Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ 
        ...n, 
        isRead: true, 
        readAt: new Date().toISOString() 
      })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast.error(error.response?.data?.message || "Failed to mark all as read");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      const deletedNotification = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      
      // Update unread count if deleted notification was unread
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success("Notification deleted");
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast.error(error.response?.data?.message || "Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications cleared");
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
      toast.error(error.response?.data?.message || "Failed to clear notifications");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptConnection = async (requestId: string, notificationId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      const response = await acceptConnectionFromNotification(requestId);
      
      // Mark notification as read
      await handleMarkAsRead(notificationId);
      
      toast.success(response.message || "Connection request accepted!");
      
      // Refresh notifications to get updated status
      await fetchNotifications();
    } catch (error: any) {
      console.error('Error accepting connection:', error);
      toast.error(error.response?.data?.message || "Failed to accept request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineConnection = async (requestId: string, notificationId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      const response = await declineConnectionFromNotification(requestId);
      
      // Mark notification as read
      await handleMarkAsRead(notificationId);
      
      toast.success(response.message || "Connection request declined");
      
      // Refresh notifications
      await fetchNotifications();
    } catch (error: any) {
      console.error('Error declining connection:', error);
      toast.error(error.response?.data?.message || "Failed to decline request");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredNotifications = notifications.filter(n =>
    filter === "all" ? true : !n.isRead
  );

  const groupedNotifications = {
    today: filteredNotifications.filter(n => {
      const today = new Date();
      const notifDate = new Date(n.createdAt);
      return notifDate.toDateString() === today.toDateString();
    }),
    earlier: filteredNotifications.filter(n => {
      const today = new Date();
      const notifDate = new Date(n.createdAt);
      return notifDate.toDateString() !== today.toDateString();
    }),
  };

  const backPath = isTrainer ? "/trainer/dashboard" : "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(backPath)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  {unreadCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <span className="text-xs text-white font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </motion.div>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Notifications</h1>
                  <p className="text-sm text-white/60">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Filter className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-white/10">
                  <DropdownMenuItem 
                    onClick={() => setFilter("all")} 
                    className="text-white hover:bg-white/10 cursor-pointer"
                  >
                    All Notifications
                    {filter === "all" && <CheckCircle className="h-4 w-4 ml-2" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setFilter("unread")} 
                    className="text-white hover:bg-white/10 cursor-pointer"
                  >
                    Unread Only
                    {filter === "unread" && <CheckCircle className="h-4 w-4 ml-2" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white/70 hover:text-white hover:bg-white/10"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Settings className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-white/10">
                  <DropdownMenuItem 
                    onClick={handleMarkAllAsRead} 
                    className="text-white hover:bg-white/10 cursor-pointer"
                    disabled={isProcessing || unreadCount === 0}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark all as read
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleClearAll} 
                    className="text-red-400 hover:bg-white/10 cursor-pointer"
                    disabled={isProcessing || notifications.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 container mx-auto px-4 py-6">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full mb-6 bg-white/5 border border-white/10 p-1 rounded-2xl">
            <TabsTrigger
              value="all"
              className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-white/60"
            >
              All ({filteredNotifications.length})
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white text-white/60"
            >
              Messages ({filteredNotifications.filter(n => n.type === "message").length})
            </TabsTrigger>
            <TabsTrigger
              value="connections"
              className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-white/60"
            >
              Connections ({filteredNotifications.filter(n => 
                n.type === "connection" || 
                n.type === "connection_accepted" || 
                n.type === "connection_declined"
              ).length})
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
                <p className="text-white/60">Loading notifications...</p>
              </div>
            </div>
          ) : (
            <>
              <TabsContent value="all">
                <NotificationList
                  groupedNotifications={groupedNotifications}
                  getTimeAgo={getTimeAgo}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                  markAsRead={handleMarkAsRead}
                  deleteNotification={handleDelete}
                  handleAcceptConnection={handleAcceptConnection}
                  handleDeclineConnection={handleDeclineConnection}
                  isProcessing={isProcessing}
                />
              </TabsContent>

              <TabsContent value="messages">
                <NotificationList
                  groupedNotifications={{
                    today: groupedNotifications.today.filter(n => n.type === "message"),
                    earlier: groupedNotifications.earlier.filter(n => n.type === "message"),
                  }}
                  getTimeAgo={getTimeAgo}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                  markAsRead={handleMarkAsRead}
                  deleteNotification={handleDelete}
                  handleAcceptConnection={handleAcceptConnection}
                  handleDeclineConnection={handleDeclineConnection}
                  isProcessing={isProcessing}
                />
              </TabsContent>

              <TabsContent value="connections">
                <NotificationList
                  groupedNotifications={{
                    today: groupedNotifications.today.filter(n => 
                      n.type === "connection" || 
                      n.type === "connection_accepted" || 
                      n.type === "connection_declined"
                    ),
                    earlier: groupedNotifications.earlier.filter(n => 
                      n.type === "connection" || 
                      n.type === "connection_accepted" || 
                      n.type === "connection_declined"
                    ),
                  }}
                  getTimeAgo={getTimeAgo}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                  markAsRead={handleMarkAsRead}
                  deleteNotification={handleDelete}
                  handleAcceptConnection={handleAcceptConnection}
                  handleDeclineConnection={handleDeclineConnection}
                  isProcessing={isProcessing}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

interface NotificationListProps {
  groupedNotifications: {
    today: Notification[];
    earlier: Notification[];
  };
  getTimeAgo: (date: string) => string;
  getNotificationIcon: (type: Notification["type"]) => JSX.Element;
  getNotificationColor: (type: Notification["type"]) => string;
  markAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  handleAcceptConnection: (requestId: string, notificationId: string) => void;
  handleDeclineConnection: (requestId: string, notificationId: string) => void;
  isProcessing: boolean;
}

const NotificationList = ({
  groupedNotifications,
  getTimeAgo,
  getNotificationIcon,
  getNotificationColor,
  markAsRead,
  deleteNotification,
  handleAcceptConnection,
  handleDeclineConnection,
  isProcessing,
}: NotificationListProps) => {
  const hasNotifications =
    groupedNotifications.today.length > 0 || groupedNotifications.earlier.length > 0;

  if (!hasNotifications) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="p-6 rounded-full bg-white/5 mb-4">
          <Bell className="h-12 w-12 text-white/30" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No notifications</h3>
        <p className="text-white/50">You're all caught up!</p>
      </motion.div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <AnimatePresence mode="popLayout">
        {groupedNotifications.today.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 px-2">
              Today
            </h3>
            <div className="space-y-3">
              {groupedNotifications.today.map((notification, index) => (
                <NotificationCard
                  key={notification._id}
                  notification={notification}
                  index={index}
                  getTimeAgo={getTimeAgo}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                  markAsRead={markAsRead}
                  deleteNotification={deleteNotification}
                  handleAcceptConnection={handleAcceptConnection}
                  handleDeclineConnection={handleDeclineConnection}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          </div>
        )}

        {groupedNotifications.earlier.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 px-2">
              Earlier
            </h3>
            <div className="space-y-3">
              {groupedNotifications.earlier.map((notification, index) => (
                <NotificationCard
                  key={notification._id}
                  notification={notification}
                  index={index}
                  getTimeAgo={getTimeAgo}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                  markAsRead={markAsRead}
                  deleteNotification={deleteNotification}
                  handleAcceptConnection={handleAcceptConnection}
                  handleDeclineConnection={handleDeclineConnection}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </ScrollArea>
  );
};

interface NotificationCardProps {
  notification: Notification;
  index: number;
  getTimeAgo: (date: string) => string;
  getNotificationIcon: (type: Notification["type"]) => JSX.Element;
  getNotificationColor: (type: Notification["type"]) => string;
  markAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  handleAcceptConnection: (requestId: string, notificationId: string) => void;
  handleDeclineConnection: (requestId: string, notificationId: string) => void;
  isProcessing: boolean;
}

const NotificationCard = ({
  notification,
  index,
  getTimeAgo,
  getNotificationIcon,
  getNotificationColor,
  markAsRead,
  deleteNotification,
  handleAcceptConnection,
  handleDeclineConnection,
  isProcessing,
}: NotificationCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => !notification.isRead && markAsRead(notification._id)}
      className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
        notification.isRead
          ? "bg-white/5 border-white/10"
          : "bg-gradient-to-r from-white/10 to-white/5 border-white/20 shadow-lg"
      }`}
    >
      {/* Unread Indicator */}
      {!notification.isRead && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50"
        />
      )}

      <div className="flex items-start gap-4">
        {/* Avatar/Icon */}
        <div className="relative flex-shrink-0">
          {notification.sender?.profileImage ? (
            <div className="relative">
              <img
                src={notification.sender.profileImage}
                alt={notification.sender.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20"
              />
              <div
                className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-gradient-to-r ${getNotificationColor(
                  notification.type
                )} shadow-lg`}
              >
                {getNotificationIcon(notification.type)}
              </div>
            </div>
          ) : (
            <div
              className={`p-3 rounded-xl bg-gradient-to-r ${getNotificationColor(
                notification.type
              )} shadow-lg`}
            >
              {getNotificationIcon(notification.type)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white truncate">
              {notification.sender?.name || notification.title}
            </h4>
            <Badge
              variant="outline"
              className={`text-xs border-none bg-gradient-to-r ${getNotificationColor(
                notification.type
              )} bg-clip-text text-transparent capitalize`}
            >
              {notification.type.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-sm text-white/70 line-clamp-2 mb-2">
            {notification.message}
          </p>
          <span className="text-xs text-white/40">{getTimeAgo(notification.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                markAsRead(notification._id);
              }}
              className="h-8 w-8 text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10"
              disabled={isProcessing}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              deleteNotification(notification._id);
            }}
            className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-red-500/10"
            disabled={isProcessing}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Connection Request Actions */}
      {notification.type === "connection" && !notification.isRead && notification.metadata?.requestId && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex gap-2 mt-4 pt-4 border-t border-white/10"
        >
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25"
            onClick={(e) => {
              e.stopPropagation();
              handleAcceptConnection(notification.metadata!.requestId!, notification._id);
            }}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              handleDeclineConnection(notification.metadata!.requestId!, notification._id);
            }}
            disabled={isProcessing}
          >
            Decline
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Notifications;