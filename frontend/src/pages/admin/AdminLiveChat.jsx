import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { bankService } from '../../api/bank';

export default function AdminLiveChat() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = async () => {
    try {
      const res = await bankService.adminListChatConversations();
      const list = res.data?.conversations || [];

      setConversations(list);

      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      setError(err.message || 'Could not load conversations.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;

    try {
      setMessagesLoading(true);

      const res =
        await bankService.adminGetChatMessages(conversationId);

      setMessages(res.data?.messages || []);
      setSelectedConversation(res.data?.conversation || null);
    } catch (err) {
      setError(err.message || 'Could not load messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();

    const interval = setInterval(() => {
      loadConversations();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    loadMessages(selectedId);

    const interval = setInterval(() => {
      loadMessages(selectedId);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedId]);

  const handleSend = async (e) => {
    e.preventDefault();

    if (!message.trim() || !selectedId || sending) return;

    try {
      setSending(true);
      setError('');

      await bankService.adminSendChatMessage(
        selectedId,
        message
      );

      setMessage('');
      await loadMessages(selectedId);
      await loadConversations();
    } catch (err) {
      setError(err.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!selectedId) return;

    try {
      setError('');

      await bankService.adminCloseChatConversation(selectedId);

      await loadConversations();
      await loadMessages(selectedId);
    } catch (err) {
      setError(err.message || 'Could not close conversation.');
    }
  };

  const selectedFromList = conversations.find(
    (conversation) => conversation.id === selectedId
  );

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] min-h-[600px] flex-col">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">
            Live Chat
          </h1>

          <p className="mt-1 text-sm text-muted">
            Respond to customer support conversations.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-md2 bg-[#FEE2E2] px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        )}

        <div className="mt-6 flex min-h-0 flex-1 overflow-hidden rounded-lg2 border border-line bg-surface shadow-sm2">
          <div className="w-80 flex-shrink-0 border-r border-line">
            <div className="border-b border-line px-4 py-4">
              <div className="text-sm font-bold text-ink">
                Customer Conversations
              </div>

              <div className="mt-1 text-xs text-muted">
                {conversations.length} conversation
                {conversations.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="p-5 text-sm text-muted">
                  Loading conversations…
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-5 text-sm text-muted">
                  No customer conversations yet.
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full border-b border-line px-4 py-4 text-left transition-colors ${
                      selectedId === conversation.id
                        ? 'bg-[#EFF6FF]'
                        : 'hover:bg-bg'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-ink">
                          {conversation.customer_name || 'Customer'}
                        </div>

                        <div className="mt-0.5 truncate text-xs text-muted">
                          {conversation.customer_email || ''}
                        </div>
                      </div>

                      <span
                        className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          conversation.status === 'open'
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}
                      />
                    </div>

                    <div className="mt-2 truncate text-xs text-muted">
                      {conversation.last_message || 'No messages yet.'}
                    </div>

                    {conversation.member_number && (
                      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Member #{conversation.member_number}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {!selectedId ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted">
                Select a conversation to begin.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div>
                    <div className="text-sm font-bold text-ink">
                      {selectedConversation?.customer_name ||
                        selectedFromList?.customer_name ||
                        'Customer'}
                    </div>

                    <div className="mt-0.5 text-xs text-muted">
                      {selectedConversation?.customer_email ||
                        selectedFromList?.customer_email ||
                        ''}
                    </div>
                  </div>

                  <button
                    onClick={handleClose}
                    disabled={
                      selectedConversation?.status !== 'open'
                    }
                    className="rounded-md2 border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Close Chat
                  </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-bg p-5">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="text-center text-sm text-muted">
                      Loading messages…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-sm text-muted">
                      No messages in this conversation yet.
                    </div>
                  ) : (
                    messages.map((item) => {
                      const isSupport =
                        item.sender_role !== 'customer';

                      return (
                        <div
                          key={item.id}
                          className={`flex ${
                            isSupport
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg2 px-4 py-3 ${
                              isSupport
                                ? 'bg-navy text-white'
                                : 'border border-line bg-surface text-ink'
                            }`}
                          >
                            <div
                              className={`mb-1 text-[10px] font-bold ${
                                isSupport
                                  ? 'text-white/60'
                                  : 'text-muted'
                              }`}
                            >
                              {isSupport
                                ? item.sender_name || 'Support'
                                : item.sender_name || 'Customer'}
                            </div>

                            <div className="whitespace-pre-wrap text-sm">
                              {item.message}
                            </div>

                            <div
                              className={`mt-1.5 text-[10px] ${
                                isSupport
                                  ? 'text-white/50'
                                  : 'text-muted'
                              }`}
                            >
                              {new Date(
                                item.created_at
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={handleSend}
                  className="border-t border-line bg-surface p-4"
                >
                  {selectedConversation?.status !== 'open' ? (
                    <div className="rounded-md2 bg-bg px-4 py-3 text-center text-xs font-semibold text-muted">
                      This conversation is closed.
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your reply…"
                        className="min-w-0 flex-1 rounded-md2 border border-line bg-white px-4 py-3 text-sm outline-none focus:border-blue"
                      />

                      <button
                        type="submit"
                        disabled={sending || !message.trim()}
                        className="rounded-md2 bg-navy px-5 py-3 text-xs font-bold text-white hover:bg-blue disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? 'Sending…' : 'Send'}
                      </button>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
