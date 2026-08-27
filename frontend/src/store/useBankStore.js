import { create } from 'zustand';
import { bankService } from '../api/bank';

export const useBankStore = create((set, get) => ({
  accounts: [],
  transactions: [],
  creditScore: null,
  investments: [],
  portfolioValue: 0,
  loading: false,
  error: null,
  toast: null,

  showToast: (message) => {
    set({ toast: message });
    setTimeout(() => set({ toast: null }), 3500);
  },

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await bankService.getAccounts();
      set({ accounts: res.data.accounts, loading: false });
    } catch (err) {
      set({ error: err.message || 'Could not load accounts.', loading: false });
    }
  },

  fetchRecentActivity: async () => {
    try {
      const res = await bankService.getRecentActivity();
      set({ transactions: res.data.transactions });
    } catch (err) {
      set({ error: err.message || 'Could not load recent activity.' });
    }
  },

  fetchCreditScore: async () => {
    try {
      const res = await bankService.getCreditScore();
      set({ creditScore: res.data.score });
    } catch (err) {
      set({ error: err.message || 'Could not load credit score.' });
    }
  },

  fetchInvestments: async () => {
    try {
      const res = await bankService.getInvestments();
      set({ investments: res.data.investments, portfolioValue: res.data.portfolioValue });
    } catch (err) {
      set({ error: err.message || 'Could not load investments.' });
    }
  },

  submitTransfer: async (payload) => {
    const res = await bankService.createTransfer(payload);
    await get().fetchAccounts();
    await get().fetchRecentActivity();
    return res.data.transfer;
  },
}));
