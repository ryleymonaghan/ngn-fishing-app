// ─────────────────────────────────────────────
// NGN Fishing — Zustand Stores
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchLiveConditions } from '@services/conditionsService';
import { generateFishingReport } from '@services/reportService';
import {
  STORAGE_KEYS,
  DEFAULT_LOCATION,
  FREE_REPORT_LIMIT,
  OFFSHORE_SAFETY,
} from '@constants/index';
import type {
  ConditionsStore,
  WizardStore,
  ReportStore,
  AuthStore,
  WizardDraft,
  FishingReport,
  LiveConditions,
  UserLocation,
} from '@app-types/index';

// ── Default Wizard Draft ──────────────────────
const DEFAULT_DRAFT: WizardDraft = {
  date:           new Date().toISOString().slice(0, 10),
  timeWindow:     'morning',
  accessType:     'boat',
  boatLengthFt:   OFFSHORE_SAFETY.DEFAULT_BOAT_LENGTH_FT,
  boatSpeedMph:   OFFSHORE_SAFETY.DEFAULT_BOAT_SPEED_MPH,
  species:        [],
  isOffshore:     false,
  baitType:       'live',
  baitIds:        [],
};

// ── Conditions Store ──────────────────────────
export const useConditionsStore = create<ConditionsStore>((set, get) => ({
  conditions: null,
  isLoading:  false,
  error:      null,

  fetchConditions: async (location: UserLocation) => {
    set({ isLoading: true, error: null });
    try {
      const conditions = await fetchLiveConditions(location);
      set({ conditions, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  refresh: async () => {
    const { conditions, fetchConditions } = get();
    const location = conditions?.location ?? DEFAULT_LOCATION;
    await fetchConditions(location);
  },
}));

// ── Wizard Store ──────────────────────────────
export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      draft:       DEFAULT_DRAFT,
      currentStep: 1,

      setStep: (step) => set({ currentStep: step }),

      updateDraft: (partial) =>
        set((state) => ({ draft: { ...state.draft, ...partial } })),

      resetDraft: () =>
        set({
          draft:       { ...DEFAULT_DRAFT, date: new Date().toISOString().slice(0, 10) },
          currentStep: 1,
        }),
    }),
    {
      name:    STORAGE_KEYS.WIZARD_DRAFT,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ── Report Store ──────────────────────────────
export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      reports:       [],
      activeReport:  null,
      isGenerating:  false,
      error:         null,

      generateReport: async (draft, conditions) => {
        set({ isGenerating: true, error: null });
        try {
          const report = await generateFishingReport(draft, conditions);
          set((state) => ({
            reports:      [report, ...state.reports].slice(0, 50), // keep last 50
            activeReport: report,
            isGenerating: false,
          }));
        } catch (err: any) {
          set({ error: err.message, isGenerating: false });
          throw err;
        }
      },

      setActiveReport: (report) => set({ activeReport: report }),

      loadHistory: async () => {
        // Reports are persisted via zustand-persist — no-op unless migrating
      },
    }),
    {
      name:    STORAGE_KEYS.REPORT_HISTORY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ reports: state.reports }),
    }
  )
);

// ── Auth Store ────────────────────────────────
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user:      null,
      isLoading: false,

      signIn: async (email, password) => {
        set({ isLoading: true });
        try {
          // TODO: Supabase auth integration
          // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          set({ isLoading: false });
        } catch (err: any) {
          set({ isLoading: false });
          throw err;
        }
      },

      signUp: async (email, password, name) => {
        set({ isLoading: true });
        try {
          // TODO: Supabase auth integration
          set({ isLoading: false });
        } catch (err: any) {
          set({ isLoading: false });
          throw err;
        }
      },

      signOut: async () => {
        set({ user: null });
      },

      loadUser: async () => {
        // TODO: Restore session from Supabase
      },

      canGenerateReport: () => {
        const { user } = get();
        // Unauthenticated users get FREE_REPORT_LIMIT reports
        if (!user) {
          const { reports } = useReportStore.getState();
          return reports.length < FREE_REPORT_LIMIT;
        }
        if (user.subscription.isActive) return true;
        return user.reportsUsed < FREE_REPORT_LIMIT;
      },
    }),
    {
      name:    STORAGE_KEYS.AUTH_TOKEN,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
