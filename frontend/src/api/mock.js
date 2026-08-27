// In-memory mock backend, used when VITE_USE_MOCK=true. Mirrors the shape of
// the real Express API responses so components never need to know which mode
// they're running in. All data here is clearly-labeled demo data.

let mockCustomer = {
  id: 'mock-user-1',
  memberNumber: 'MT-2081-4471',
  fullName: 'Edward Etkinson',
  email: 'edward.etkinson@example.com',
  role: 'customer',
  status: 'active',
  kycStatus: 'verified',
  avatarInitials: 'EE',
};

let mockAccounts = [
  {
    id: 'acc-checking',
    account_type: 'checking',
    nickname: 'Everyday Checking',
    account_number: '4821009931',
    balance: 84215.22,
    available_balance: 84215.22,
    status: 'active',
  },
  {
    id: 'acc-savings',
    account_type: 'savings',
    nickname: 'High-Yield Savings',
    account_number: '7304115502',
    balance: 1120000.0,
    available_balance: 1120000.0,
    apy: 4.5,
    savings_goal: 1500000,
    status: 'active',
  },
  {
    id: 'acc-credit',
    account_type: 'credit',
    nickname: 'Visa Signature Card',
    account_number: '9901558820',
    balance: 1447.0,
    available_balance: 48553.0,
    credit_limit: 50000,
    status: 'active',
  },
  {
    id: 'acc-brokerage',
    account_type: 'savings',
    nickname: 'Brokerage / Investment Account',
    account_number: '5512207744',
    balance: 850000.0,
    available_balance: 850000.0,
    status: 'active',
  },
];

let mockInvestments = [
  { id: 'inv-1', symbol: 'TSLA', company_name: 'Tesla, Inc.', shares: 220, avg_cost: 189.4, current_price: 248.12 },
  { id: 'inv-2', symbol: 'AAPL', company_name: 'Apple Inc.', shares: 400, avg_cost: 165.2, current_price: 214.88 },
  { id: 'inv-3', symbol: 'NVDA', company_name: 'NVIDIA Corporation', shares: 150, avg_cost: 410.0, current_price: 612.55 },
  { id: 'inv-4', symbol: 'VOO', company_name: 'Vanguard S&P 500 ETF', shares: 500, avg_cost: 380.0, current_price: 452.3 },
  { id: 'inv-5', symbol: 'MSFT', company_name: 'Microsoft Corporation', shares: 180, avg_cost: 310.0, current_price: 398.21 },
];

let mockTransactions = [
  { id: 't1', account_id: 'acc-checking', direction: 'credit', category: 'income', description: 'Direct Deposit — Employer', amount: 12450.0, created_at: new Date().toISOString() },
  { id: 't2', account_id: 'acc-credit', direction: 'debit', category: 'shopping', description: 'Amazon', amount: 267.99, created_at: daysAgo(1) },
  { id: 't3', account_id: 'acc-checking', direction: 'debit', category: 'food', description: 'Nobu Restaurant', amount: 314.25, created_at: daysAgo(3) },
  { id: 't4', account_id: 'acc-checking', direction: 'debit', category: 'transfer', description: 'Transfer to Brokerage', amount: 5000.0, created_at: daysAgo(4) },
  { id: 't5', account_id: 'acc-checking', direction: 'debit', category: 'bills', description: 'Con Edison Utilities', amount: 184.5, created_at: daysAgo(5) },
  { id: 't6', account_id: 'acc-credit', direction: 'debit', category: 'gas', description: 'Shell Gas Station', amount: 82.4, created_at: daysAgo(6) },
  { id: 't7', account_id: 'acc-checking', direction: 'debit', category: 'taxes', description: 'Internal Revenue Service — Est. Tax', amount: 4200.0, created_at: daysAgo(20) },
  { id: 't8', account_id: 'acc-brokerage', direction: 'credit', category: 'investment', description: 'TSLA daily gain (1.8%)', amount: 981.4, created_at: daysAgo(1) },
];

let mockTransfers = [];
let mockNotifications = [
  { id: 'notif-1', title: 'Direct deposit received', body: 'Your paycheck of $12,450.00 was deposited.', read: false, created_at: daysAgo(0) },
  { id: 'notif-2', title: 'TSLA daily gain posted', body: 'Your Tesla holding gained 1.8% today (+$981.40).', read: false, created_at: daysAgo(1) },
  { id: 'notif-3', title: 'Bill paid', body: 'Con Edison Utilities — $184.50 was paid automatically.', read: true, created_at: daysAgo(5) },
];
let mockBills = [
  { id: 'bill-1', payee: 'Con Edison Utilities', category: 'bills', amount: 184.5, frequency: 'monthly', next_run_date: daysFromNow(3), account_id: 'acc-checking', account_nickname: 'Everyday Checking' },
  { id: 'bill-2', payee: 'Verizon Wireless', category: 'bills', amount: 96.0, frequency: 'monthly', next_run_date: daysFromNow(7), account_id: 'acc-checking', account_nickname: 'Everyday Checking' },
  { id: 'bill-3', payee: 'Blue Cross Blue Shield Premium', category: 'bills', amount: 612.0, frequency: 'monthly', next_run_date: daysFromNow(1), account_id: 'acc-checking', account_nickname: 'Everyday Checking' },
  { id: 'bill-4', payee: 'Internal Revenue Service — Est. Tax', category: 'taxes', amount: 4200.0, frequency: 'quarterly', next_run_date: daysFromNow(15), account_id: 'acc-checking', account_nickname: 'Everyday Checking' },
];
let mockCreditScore = {
  value: 796,
  band: 'GOOD',
  factors: {
    paymentHistory: { pct: 100, grade: 'Excellent' },
    usage: { pct: 3, grade: 'Excellent' },
    creditAgeYears: 12,
    hardInquiries: 1,
  },
};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export const mockApi = {
  async register({ fullName, email }) {
    await delay(400);
    if (!fullName || !email) throw { message: 'Full name and email are required.' };
    mockCustomer = { ...mockCustomer, fullName, email, avatarInitials: fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() };
    return { token: 'mock-token', data: { user: mockCustomer } };
  },
  async login(email, password) {
    await delay();
    if (!email || !password) throw { message: 'The email or password you entered is incorrect.' };
    return { token: 'mock-token', data: { user: mockCustomer } };
  },
  async getMe() {
    await delay(150);
    return { data: { user: mockCustomer } };
  },
  async getAccounts() {
    await delay();
    return { data: { accounts: mockAccounts } };
  },
  async getAccountById(accountId) {
    await delay(150);
    const account = mockAccounts.find((a) => a.id === accountId);
    if (!account) throw { message: 'Account not found.' };
    return { data: { account: { ...account, created_at: daysAgo(365 * 3) } } };
  },
  async getAccountTransactions(accountId) {
    await delay();
    return { data: { transactions: mockTransactions.filter((t) => t.account_id === accountId) } };
  },
  async getNotifications() {
    await delay();
    return { data: { notifications: mockNotifications, unreadCount: mockNotifications.filter((n) => !n.read).length } };
  },
  async markNotificationRead(id) {
    await delay(150);
    const n = mockNotifications.find((n) => n.id === id);
    if (n) n.read = true;
    return { data: { notification: n } };
  },
  async markAllNotificationsRead() {
    await delay(150);
    mockNotifications.forEach((n) => (n.read = true));
    return { data: {} };
  },
  async getRecentActivity() {
    await delay();
    return { data: { transactions: [...mockTransactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) } };
  },
  async getCreditScore() {
    await delay();
    return { data: { score: mockCreditScore } };
  },
  async simulateCredit(scenario) {
    await delay();
    const delta = scenario === 'payoff_credit_card' ? 16 : 10;
    return { data: { currentScore: mockCreditScore.value, projectedScore: mockCreditScore.value + delta, delta } };
  },
  async getInvestments() {
    await delay();
    const withMetrics = mockInvestments.map((inv) => {
      const marketValue = inv.shares * inv.current_price;
      const costBasis = inv.shares * inv.avg_cost;
      return {
        ...inv,
        marketValue: Number(marketValue.toFixed(2)),
        totalGainLoss: Number((marketValue - costBasis).toFixed(2)),
        totalGainLossPct: Number((((marketValue - costBasis) / costBasis) * 100).toFixed(2)),
      };
    });
    const portfolioValue = withMetrics.reduce((sum, i) => sum + i.marketValue, 0);
    return { data: { investments: withMetrics, portfolioValue: Number(portfolioValue.toFixed(2)) } };
  },
  async createTransfer({ fromAccountId, toAccountId, amount, memo, kind, recipientName, externalBankName, externalAccountNumber, externalRoutingNumber }) {
    await delay(500);
    const amt = Number(amount);
    const from = mockAccounts.find((a) => a.id === fromAccountId);
    const to = mockAccounts.find((a) => a.id === toAccountId);
    const isExternal = !to;
    if (!from) throw { message: 'Source account not found.' };
    if (from.available_balance < amt) throw { message: 'Insufficient funds to complete this transfer.' };
    if (isExternal && (!recipientName || !externalBankName || !externalAccountNumber)) {
      throw { message: 'Recipient name, bank name, and account number are required.' };
    }
    if (isExternal && kind !== 'zelle' && !/^\d{9}$/.test(externalRoutingNumber || '')) {
      throw { message: 'Routing number must be exactly 9 digits.' };
    }

    from.available_balance -= amt;
    // Internal transfers settle instantly in this mock, same as the real API.
    // External transfers stay "pending" — funds are held but not yet moved,
    // mirroring the admin-approval-queue behavior of the backend.
    if (!isExternal) {
      from.balance -= amt;
      to.balance += amt;
      to.available_balance += amt;
    }

    const transfer = {
      id: 'tr-' + Date.now(),
      amount: amt,
      memo,
      kind: kind || (to ? 'internal' : 'external_ach'),
      status: isExternal ? 'pending' : 'completed',
      from_nickname: from.nickname,
      to_nickname: to?.nickname,
      from_account_number: from.account_number,
      to_account_number: to?.account_number,
      recipient_name: recipientName,
      external_bank_name: externalBankName,
      external_account_number: externalAccountNumber,
      balance_after: from.balance,
      created_at: new Date().toISOString(),
      processed_at: isExternal ? null : new Date().toISOString(),
    };
    mockTransfers.unshift(transfer);
    if (!isExternal) {
      mockTransactions.unshift({
        id: 'tx-' + Date.now(),
        account_id: from.id,
        direction: 'debit',
        category: 'transfer',
        description: `Transfer to ${to.nickname}`,
        amount: amt,
        created_at: new Date().toISOString(),
      });
    }
    return { data: { transfer } };
  },
  async getTransfers() {
    await delay();
    return { data: { transfers: mockTransfers } };
  },
  async getReceipt(transferId) {
    await delay(200);
    const transfer = mockTransfers.find((t) => t.id === transferId);
    if (!transfer) throw { message: 'Receipt not found.' };
    const isExternal = transfer.kind && transfer.kind !== 'internal';
    return {
      data: {
        receipt: {
          referenceNumber: transfer.id.replace('tr-', '').slice(0, 8).toUpperCase(),
          status: transfer.status,
          amount: transfer.amount,
          memo: transfer.memo,
          fromAccount: `${transfer.from_nickname} (••${transfer.from_account_number.slice(-4)})`,
          toAccount: transfer.to_nickname
            ? `${transfer.to_nickname} (••${transfer.to_account_number.slice(-4)})`
            : isExternal
            ? `${transfer.recipient_name} — ${transfer.external_bank_name} (••••${String(transfer.external_account_number).slice(-4)})`
            : 'External Account',
          isExternal,
          memberName: mockCustomer.fullName,
          memberNumber: mockCustomer.memberNumber,
          createdAt: transfer.created_at,
          processedAt: transfer.processed_at,
          balanceAfter: transfer.balance_after,
        },
      },
    };
  },
  async getBills() {
    await delay();
    return { data: { bills: [...mockBills].sort((a, b) => new Date(a.next_run_date) - new Date(b.next_run_date)) } };
  },
  async payBillNow(billId) {
    await delay(400);
    const bill = mockBills.find((b) => b.id === billId);
    if (!bill) throw { message: 'Bill not found.' };
    const account = mockAccounts.find((a) => a.id === bill.account_id);
    if (!account) throw { message: 'Linked account not found.' };
    if (account.available_balance < bill.amount) throw { message: 'Insufficient funds to complete this transfer.' };
    account.balance -= bill.amount;
    account.available_balance -= bill.amount;
    const next = new Date(bill.next_run_date);
    if (bill.frequency === 'weekly') next.setDate(next.getDate() + 7);
    else if (bill.frequency === 'quarterly') next.setMonth(next.getMonth() + 3);
    else next.setMonth(next.getMonth() + 1);
    bill.next_run_date = next.toISOString().split('T')[0];
    const txn = {
      id: 'tx-' + Date.now(),
      account_id: account.id,
      direction: 'debit',
      category: bill.category,
      description: bill.payee,
      amount: bill.amount,
      created_at: new Date().toISOString(),
    };
    mockTransactions.unshift(txn);
    return { data: { transaction: txn } };
  },
  async payAdHocBill({ accountId, payee, amount, category }) {
    await delay(400);
    const amt = Number(amount);
    const account = mockAccounts.find((a) => a.id === accountId);
    if (!account) throw { message: 'Account not found.' };
    if (!payee) throw { message: 'Enter who you\u2019re paying.' };
    if (!amt || amt <= 0) throw { message: 'Enter a valid amount.' };
    if (account.available_balance < amt) throw { message: 'Insufficient funds to complete this transfer.' };
    account.balance -= amt;
    account.available_balance -= amt;
    const txn = {
      id: 'tx-' + Date.now(),
      account_id: account.id,
      direction: 'debit',
      category: category || 'bills',
      description: payee,
      amount: amt,
      created_at: new Date().toISOString(),
    };
    mockTransactions.unshift(txn);
    return { data: { transaction: txn } };
  },
  async mobileDeposit({ amount, frontCaptured, backCaptured }) {
    await delay(600);
    const amt = Number(amount);
    if (!amt || amt <= 0) throw { message: 'Enter a valid check amount.' };
    if (!frontCaptured || !backCaptured) throw { message: 'Capture both the front and back of the check before submitting.' };
    const account = mockAccounts.find((a) => a.account_type === 'checking');
    account.balance += amt;
    account.available_balance += amt;
    const txn = {
      id: 'tx-' + Date.now(),
      account_id: account.id,
      direction: 'credit',
      category: 'deposit',
      description: 'Mobile Check Deposit',
      amount: amt,
      created_at: new Date().toISOString(),
    };
    mockTransactions.unshift(txn);
    return { data: { transaction: txn } };
  },
  async getNotifications() {
    await delay(200);
    const notifications = [
      { id: 'n1', title: 'Direct deposit received', body: 'Your employer deposit of $12,450.00 has arrived.', read: false, created_at: daysAgo(0) },
      { id: 'n2', title: 'TSLA daily gain posted', body: 'Your brokerage account gained $981.40 today.', read: false, created_at: daysAgo(1) },
      { id: 'n3', title: 'Bill due soon', body: 'Blue Cross Blue Shield Premium ($612.00) is due tomorrow.', read: true, created_at: daysAgo(2) },
    ];
    return { data: { notifications, unreadCount: notifications.filter((n) => !n.read).length } };
  },
  async markNotificationRead(id) {
    await delay(150);
    return { data: { notification: { id, read: true } } };
  },
  async markAllNotificationsRead() {
    await delay(150);
    return { message: 'All notifications marked as read.' };
  },
};
