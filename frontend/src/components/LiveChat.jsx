import { useEffect, useRef, useState } from "react";
import { bankService } from "../api/bank";

export default function LiveChat({ onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  // Load conversation and messages
  useEffect(() => {
    let mounted = true;

    const loadChat = async () => {
      try {
        setLoading(true);
        setError("");

        const conversationResponse = await bankService.getChatConversation();

        if (!mounted) return;

        const currentConversation = conversationResponse?.data?.conversation;

        setConversation(currentConversation);

        if (currentConversation?.id) {
          const messagesResponse = await bankService.getChatMessages(
            currentConversation.id,
          );

          if (!mounted) return;

          setMessages(messagesResponse?.data?.messages || []);
        }
      } catch (err) {
        console.error("Live chat error:", err);

        if (mounted) {
          setError(
            err?.response?.data?.message ||
              "Unable to load Live Chat. Please try again.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadChat();

    return () => {
      mounted = false;
    };
  }, []);

  // Scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Refresh messages every 5 seconds
  useEffect(() => {
    if (!conversation?.id) return;

    const interval = setInterval(async () => {
      try {
        const response = await bankService.getChatMessages(conversation.id);

        setMessages(response?.data?.messages || []);
      } catch (err) {
        console.error("Unable to refresh chat messages:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [conversation?.id]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const text = messageText.trim();

    if (!text || !conversation?.id || sending) {
      return;
    }

    try {
      setSending(true);
      setError("");

      const response = await bankService.sendChatMessage(conversation.id, text);

      const newMessage = response?.data?.message;

      if (newMessage) {
        setMessages((previousMessages) => [...previousMessages, newMessage]);
      }

      setMessageText("");
    } catch (err) {
      console.error("Send chat message error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to send your message. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleCloseChat = async () => {
    if (!conversation?.id) {
      onClose();
      return;
    }

    try {
      await bankService.closeChatConversation(conversation.id);
    } catch (err) {
      console.error("Close chat error:", err);
    } finally {
      onClose();
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";

    return new Date(dateString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end bg-black/30 p-4 sm:items-center sm:p-6">
      <div className="flex h-[650px] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl">
              💬
            </div>

            <div>
              <h2 className="font-semibold">Live Chat</h2>

              <div className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Support is available
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseChat}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-slate-500">Loading chat...</div>
            </div>
          ) : (
            <>
              {/* Welcome message */}
              <div className="mb-5 flex justify-center">
                <div className="max-w-[85%] rounded-2xl bg-white px-4 py-3 text-center text-sm text-slate-600 shadow-sm">
                  Welcome to Meridian Trust Bank support. How can we help you
                  today?
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="flex justify-center py-6">
                  <p className="text-center text-sm text-slate-400">
                    Send us a message and a support representative will assist
                    you.
                  </p>
                </div>
              ) : (
                messages.map((item) => {
                  const isCustomer = item.sender_id === conversation?.user_id;

                  return (
                    <div
                      key={item.id}
                      className={`mb-3 flex ${
                        isCustomer ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          isCustomer ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm ${
                            isCustomer
                              ? "rounded-br-md bg-slate-900 text-white"
                              : "rounded-bl-md bg-white text-slate-700 shadow-sm"
                          }`}
                        >
                          {item.message}
                        </div>

                        <div
                          className={`mt-1 px-1 text-[10px] text-slate-400 ${
                            isCustomer ? "text-right" : "text-left"
                          }`}
                        >
                          {formatTime(item.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Message input */}
        <form
          onSubmit={handleSendMessage}
          className="border-t border-slate-200 bg-white p-3"
        >
          <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-2">
            <input
              type="text"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Type your message..."
              disabled={loading || sending}
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={
                loading || sending || !messageText.trim() || !conversation?.id
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lg text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
