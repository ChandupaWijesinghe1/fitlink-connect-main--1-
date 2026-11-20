import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Send,
  Calendar,
  Loader2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { initializeSocket, getSocket, disconnectSocket } from "@/lib/socket";
import {
  getTrainerClients,
  getAllConversations,
  getConversation,
  sendMessage as sendMessageAPI,
  shareSchedule as shareScheduleAPI,
  markMessagesAsRead,
} from "@/api/messages";
import { getUserSchedules } from "@/api/schedules";
import { getAllUsers } from "@/api/trainers";  // ← NEW
import ChatThread from "@/components/chat/ChatThread";
import ChatList from "@/components/chat/ChatList";

interface Client {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
}

interface Conversation {
  conversationId: string;
  otherUser: {
    id: string;
    name: string;
    type: string;
  };
  lastMessage: {
    message: string;
    createdAt: string;
    messageType?: string;
    sender?: { id: string };
  };
  unreadCount: number;
}

interface Message {
  _id: string;
  sender: {
    id: string;
    name: string;
    type: string;
  };
  receiver: {
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

interface Schedule {
  _id: string;
  title: string;
  description: string;
  days: any[];
}

const TrainerMessages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();  // ← NEW
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState<any>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [mySchedules, setMySchedules] = useState<Schedule[]>([]);

  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isScrolled, setIsScrolled] = useState(false);

  // Initialize Socket.io
  useEffect(() => {
    if (!user?._id) return;

    const socket = initializeSocket();

    // Listen for incoming messages
    socket.on('message:receive', (message: Message) => {
      console.log('📨 Trainer received message:', message);

      // Add to messages if in active conversation
      if (selectedClient && 
          (message.sender.id === selectedClient._id ||
           message.receiver.id === selectedClient._id)) {
        setMessages(prev => [...prev, message]);

        // Mark as read
        markMessagesAsRead(selectedClient._id);
      }

      // Update conversations
      fetchConversations();
    });

    // Listen for typing indicators
    socket.on('user:typing', ({ senderId }) => {
      setTypingUsers(prev => new Set(prev).add(senderId));
    });

    socket.on('user:stopTyping', ({ senderId }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(senderId);
        return newSet;
      });
    });

    return () => {
      socket.off('message:receive');
      socket.off('user:typing');
      socket.off('user:stopTyping');
      disconnectSocket();
    };
  }, [user?._id, selectedClient]);

  // Fetch trainer's clients
  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const data = await getTrainerClients();
      setClients(data.clients || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const data = await getAllConversations();
      setConversations(data.conversations || []);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Fetch messages
  const fetchMessages = async (clientId: string) => {
    try {
      setIsLoadingMessages(true);
      const data = await getConversation(clientId);
      setMessages(data.messages || []);

      // Mark as read
      await markMessagesAsRead(clientId);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      // Don't show error toast for new conversations (404 is expected)
      if (error.response?.status !== 404) {
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Fetch trainer's schedules
  const fetchMySchedules = async () => {
    if (!user?._id) return;

    try {
      setIsLoadingSchedules(true);
      const data = await getUserSchedules(user._id);
      setMySchedules(data || []);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchClients();
      fetchConversations();
      fetchMySchedules();
    }
  }, [user?._id]);

  // ========== NEW: Auto-open client chat from URL parameter ==========
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    
    if (clientId && !selectedClient) {
      // Check if client exists in trainer's clients
      const existingClient = clients.find(c => c._id === clientId);

      if (existingClient) {
        // Open existing client
        handleClientSelect(existingClient);
      } else {
        // Fetch client data from all users and create temporary client
        openNewClientConversation(clientId);
      }
    }
  }, [searchParams, clients]);

  // Open new conversation with client
  const openNewClientConversation = async (clientId: string) => {
    try {
      // Fetch all users to find this specific client
      const allUsers = await getAllUsers();
      const clientData = allUsers.find((u: any) => u._id === clientId);
      
      if (!clientData) {
        toast({
          title: "Error",
          description: "Client not found",
          variant: "destructive",
        });
        return;
      }

      // Create temporary client object
      const newClient: Client = {
        _id: clientData._id,
        name: clientData.name,
        email: clientData.email,
        profileImage: clientData.profileImage
      };

      setSelectedClient(newClient);
      setMessages([]); // Empty messages for new conversation
      
      toast({
        title: "New Conversation",
        description: `Start chatting with ${clientData.name}`,
      });
    } catch (error: any) {
      console.error('Error opening client conversation:', error);
      toast({
        title: "Error",
        description: "Failed to open conversation with client",
        variant: "destructive",
      });
    }
  };
  // ========== END Auto-open ==========

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    fetchMessages(client._id);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedClient || !user) return;

    const socket = getSocket();
    if (!socket) return;

    try {
      setIsSending(true);

      const messageData = {
        receiverId: selectedClient._id,
        content: newMessage.trim(),
        messageType: 'text',
      };

      // Send via API. The server saves the message and pushes it to the
      // receiver over the socket, so nothing is emitted from here.
      await sendMessageAPI(messageData);

      setNewMessage("");

      // Refresh messages and conversations
      fetchMessages(selectedClient._id);
      fetchConversations(); // Update conversation list
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle share schedule
  const handleShareSchedule = async (schedule: Schedule) => {
    if (!selectedClient || !user) return;

    const socket = getSocket();
    if (!socket) return;

    try {
      const scheduleData = {
        receiverId: selectedClient._id,
        scheduleId: schedule._id,
        scheduleTitle: schedule.title,
        scheduleDays: schedule.days?.length || 0,
      };

      // Share via API
      await shareScheduleAPI(scheduleData);

      toast({
        title: "Schedule Shared!",
        description: `Shared "${schedule.title}" with ${selectedClient.name}`,
      });

      setShowScheduleSheet(false);

      // Refresh messages and conversations
      fetchMessages(selectedClient._id);
      fetchConversations(); // Update conversation list
    } catch (error: any) {
      console.error('Error sharing schedule:', error);
      toast({
        title: "Share Failed",
        description: "Failed to share schedule",
        variant: "destructive",
      });
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!selectedClient || !user) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('user:typing', {
        senderId: user._id,
        receiverId: selectedClient._id,
      });
    }
  };

  const handleStopTyping = () => {
    if (!selectedClient || !user) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('user:stopTyping', {
        senderId: user._id,
        receiverId: selectedClient._id,
      });
    }
  };

  // Get conversation for client
  const getClientConversation = (clientId: string) => {
    return conversations.find(conv => conv.otherUser.id === clientId);
  };

  // Filter clients - only show clients with conversations
  const filteredClients = clients.filter((client) =>
    conversations.some((conv) => conv.otherUser.id === client._id)
  );

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (isToday) {
      return time; // Just time for today: "3:45 PM"
    } else if (isYesterday) {
      return `Yesterday ${time}`; // "Yesterday 3:45 PM"
    } else {
      // Show date for older messages: "Jan 8, 3:45 PM"
      const dateStr = date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });
      return `${dateStr}, ${time}`;
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-[var(--app-bottom-nav)] z-30 flex flex-col overflow-hidden bg-background md:flex-row">
      {/* Sidebar - Client List (Hidden on mobile when chat is open) */}
      <div className={`${
        selectedClient ? "hidden md:flex" : "flex"
      } h-full w-full flex-col md:w-[400px] md:border-r md:border-border`}>
        <ChatList
          items={filteredClients.map((client) => {
            const conversation = getClientConversation(client._id);
            return {
              id: client._id,
              name: client.name,
              image: client.profileImage,
              preview: conversation
                ? conversation.lastMessage.messageType === "schedule"
                  ? "Shared a workout plan"
                  : conversation.lastMessage.message
                : undefined,
              time: conversation?.lastMessage.createdAt,
              unreadCount: conversation?.unreadCount || 0,
              sentByMe: String(conversation?.lastMessage.sender?.id || "") === String(user?._id || ""),
            };
          })}
          selectedId={selectedClient?._id}
          isLoading={isLoadingClients}
          emptyText="No clients yet"
          onSelect={(id) => {
            const client = filteredClients.find((item) => item._id === id);
            if (client) handleClientSelect(client);
          }}
          onBack={() => navigate("/trainer/dashboard")}
        />
      </div>

      {/* Chat Area (Shown on mobile when client is selected) */}
      {selectedClient ? (
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <ChatThread
            title={selectedClient.name}
            subtitle={typingUsers.has(selectedClient._id) ? "typing..." : undefined}
            messages={messages}
            currentUserId={user?._id}
            isLoading={isLoadingMessages}
            isSending={isSending}
            draft={newMessage}
            onDraftChange={setNewMessage}
            onSend={handleSendMessage}
            onBack={() => {
              setSelectedClient(null);
              navigate("/trainer/messages", { replace: true });
            }}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
            formatTime={formatMessageTime}
            onOpenSchedule={(scheduleId) => navigate(`/schedule/${scheduleId}`)}
            menuLabel="View progress"
            onMenu={() => navigate(`/trainer/clients/${selectedClient._id}/progress`)}
            emptyText={`Start your conversation with ${selectedClient.name}`}
            leadingAction={
              <Sheet open={showScheduleSheet} onOpenChange={setShowScheduleSheet}>
                    <SheetTrigger asChild>
                      <button
                        type="button"
                        aria-label="Share a schedule"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-accent"
                      >
                        <Calendar className="h-5 w-5" />
                      </button>
                    </SheetTrigger>
                    <SheetContent className="bg-card border-border w-[90vw] sm:w-[400px]">
                      <SheetHeader>
                        <SheetTitle className="gradient-text font-heading text-xl md:text-2xl">Share Schedule</SheetTitle>
                      </SheetHeader>
                      {isLoadingSchedules ? (
                        <div className="flex justify-center items-center py-20">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : mySchedules.length === 0 ? (
                        <div className="text-center py-20">
                          <p className="text-muted-foreground text-sm">No schedules yet</p>
                        </div>
                      ) : (
                        <div className="mt-6 space-y-3">
                          {mySchedules.map((schedule, index) => (
                            <motion.div
                              key={schedule._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <button
                                onClick={() => handleShareSchedule(schedule)}
                                className="w-full p-3 md:p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 transition-all duration-200 text-left group"
                              >
                                <div className="flex items-center gap-2 md:gap-3">
                                  <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 group-hover:from-primary/30 group-hover:to-accent/30 transition-all">
                                    <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base truncate">
                                      {schedule.title}
                                    </h4>
                                    <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground mt-1">
                                      <span>{schedule.days?.length || 0} days</span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </SheetContent>
                  </Sheet>
            }
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            </div>
            <h2 className="text-lg md:text-xl font-heading text-foreground mb-2">Select a Conversation</h2>
            <p className="text-sm md:text-base text-muted-foreground">Choose a client to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerMessages;