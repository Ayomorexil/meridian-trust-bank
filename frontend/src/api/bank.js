import api, { USE_MOCK } from "./client";
import { mockApi } from "./mock";

export const bankService = {
  // =========================
  // Authentication
  // =========================

  register: (payload) =>
    USE_MOCK
      ? mockApi.register(payload)
      : api.post("/auth/register", payload).then((r) => r.data),

  login: (email, password) =>
    USE_MOCK
      ? mockApi.login(email, password)
      : api.post("/auth/login", { email, password }).then((r) => r.data),

  getMe: () =>
    USE_MOCK ? mockApi.getMe() : api.get("/auth/me").then((r) => r.data),

  // =========================
  // Accounts
  // =========================

  getAccounts: () =>
    USE_MOCK ? mockApi.getAccounts() : api.get("/accounts").then((r) => r.data),

  getAccountById: (accountId) =>
    USE_MOCK
      ? mockApi.getAccountById(accountId)
      : api.get(`/accounts/${accountId}`).then((r) => r.data),

  getAccountTransactions: (accountId, limit = 25) =>
    USE_MOCK
      ? mockApi.getAccountTransactions(accountId)
      : api
          .get(`/accounts/${accountId}/transactions`, {
            params: { limit },
          })
          .then((r) => r.data),

  getRecentActivity: () =>
    USE_MOCK
      ? mockApi.getRecentActivity()
      : api.get("/accounts/activity/recent").then((r) => r.data),

  // =========================
  // Credit
  // =========================

  getCreditScore: () =>
    USE_MOCK
      ? mockApi.getCreditScore()
      : api.get("/credit/score").then((r) => r.data),

  simulateCredit: (scenario) =>
    USE_MOCK
      ? mockApi.simulateCredit(scenario)
      : api.post("/credit/simulate", { scenario }).then((r) => r.data),

  // =========================
  // Transfers
  // =========================

  createTransfer: (payload) =>
    USE_MOCK
      ? mockApi.createTransfer(payload)
      : api.post("/transfers", payload).then((r) => r.data),

  getTransfers: () =>
    USE_MOCK
      ? mockApi.getTransfers()
      : api.get("/transfers").then((r) => r.data),

  getReceipt: (transferId) =>
    USE_MOCK
      ? mockApi.getReceipt(transferId)
      : api.get(`/transfers/${transferId}/receipt`).then((r) => r.data),

  // =========================
  // Investments
  // =========================

  getInvestments: () =>
    USE_MOCK
      ? mockApi.getInvestments()
      : api.get("/investments").then((r) => r.data),

  // =========================
  // Bills
  // =========================

  getBills: () =>
    USE_MOCK ? mockApi.getBills() : api.get("/bills").then((r) => r.data),

  payBillNow: (billId) =>
    USE_MOCK
      ? mockApi.payBillNow(billId)
      : api.post(`/bills/${billId}/pay`).then((r) => r.data),

  payAdHocBill: (payload) =>
    USE_MOCK
      ? mockApi.payAdHocBill(payload)
      : api.post("/bills/pay", payload).then((r) => r.data),

  // =========================
  // Mobile Deposit
  // =========================

  mobileDeposit: (accountId, payload) =>
    USE_MOCK
      ? mockApi.mobileDeposit(payload)
      : api.post(`/accounts/${accountId}/deposit`, payload).then((r) => r.data),

  // =========================
  // Notifications
  // =========================

  getNotifications: () =>
    USE_MOCK
      ? mockApi.getNotifications()
      : api.get("/notifications").then((r) => r.data),

  markNotificationRead: (id) =>
    USE_MOCK
      ? mockApi.markNotificationRead(id)
      : api.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllNotificationsRead: () =>
    USE_MOCK
      ? mockApi.markAllNotificationsRead()
      : api.patch("/notifications/read-all").then((r) => r.data),

  // =========================
  // Live Chat
  // =========================

  getChatConversation: () => api.get("/chat/conversation").then((r) => r.data),

  getChatMessages: (conversationId) =>
    api
      .get(`/chat/conversation/${conversationId}/messages`)
      .then((r) => r.data),

  sendChatMessage: (conversationId, message) =>
    api
      .post(`/chat/conversation/${conversationId}/messages`, {
        message,
      })
      .then((r) => r.data),

  closeChatConversation: (conversationId) =>
    api.patch(`/chat/conversation/${conversationId}/close`).then((r) => r.data),

  // =========================
  // Admin
  // =========================

  adminSummary: () => api.get("/admin/dashboard/summary").then((r) => r.data),

adminListChatConversations: () =>
  api
    .get("/admin/chat/conversations")
    .then((r) => r.data),

adminGetChatMessages: (conversationId) =>
  api
    .get(`/admin/chat/conversations/${conversationId}/messages`)
    .then((r) => r.data),

adminSendChatMessage: (conversationId, message) =>
  api
    .post(
      `/admin/chat/conversations/${conversationId}/messages`,
      { message }
    )
    .then((r) => r.data),

adminCloseChatConversation: (conversationId) =>
  api
    .patch(
      `/admin/chat/conversations/${conversationId}/close`
    )
    .then((r) => r.data),
  adminCreateCustomer: (payload) =>
    api.post("/admin/customers", payload).then((r) => r.data),

  adminGetCreditScore: (customerId) =>
    api.get(`/admin/customers/${customerId}/credit-score`).then((r) => r.data),

  adminSetCreditScore: (customerId, payload) =>
    api
      .post(`/admin/customers/${customerId}/credit-score`, payload)
      .then((r) => r.data),

  adminListTransfers: (status) =>
    api
      .get("/admin/transfers", {
        params: { status },
      })
      .then((r) => r.data),

  adminListCustomers: (params) =>
    api
      .get("/admin/customers", {
        params,
      })
      .then((r) => r.data),

  adminListAuditLogs: () => api.get("/admin/audit-logs").then((r) => r.data),

  adminApproveTransfer: (id) =>
    api.patch(`/admin/transfers/${id}/approve`).then((r) => r.data),

  adminRejectTransfer: (id, reason) =>
    api
      .patch(`/admin/transfers/${id}/reject`, {
        reason,
      })
      .then((r) => r.data),

  adminHoldTransfer: (id, reason) =>
    api
      .patch(`/admin/transfers/${id}/hold`, {
        reason,
      })
      .then((r) => r.data),

  adminReleaseTransfer: (id) =>
    api.patch(`/admin/transfers/${id}/release`).then((r) => r.data),

  adminReverseTransfer: (id, reason) =>
    api
      .patch(`/admin/transfers/${id}/reverse`, {
        reason,
      })
      .then((r) => r.data),

  adminAdjustBalance: (accountId, payload) =>
    api
      .post(`/admin/accounts/${accountId}/adjust`, payload)
      .then((r) => r.data),

  adminFreezeAccount: (accountId, reason) =>
    api
      .patch(`/admin/accounts/${accountId}/freeze`, {
        reason,
      })
      .then((r) => r.data),

  adminUnfreezeAccount: (accountId, reason) =>
    api
      .patch(`/admin/accounts/${accountId}/unfreeze`, {
        reason,
      })
      .then((r) => r.data),

  adminSetKyc: (customerId, status, reason) =>
    api
      .patch(`/admin/customers/${customerId}/kyc`, {
        status,
        reason,
      })
      .then((r) => r.data),

  adminSuspendCustomer: (id, reason) =>
    api
      .patch(`/admin/customers/${id}/suspend`, {
        reason,
      })
      .then((r) => r.data),

  adminReactivateCustomer: (id) =>
    api.patch(`/admin/customers/${id}/reactivate`).then((r) => r.data),

  adminRunDailyCycle: () =>
    api.post("/admin/simulate/run-daily-cycle").then((r) => r.data),
};
