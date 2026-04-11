// ─────────────────────────────────────────────
// NGN Fishing — Zustand Stores
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchLiveConditions } from '@services/conditionsService';
import { generateFishingReport } from '@services/reportService';
import { fetchSpeciesForecast } from '@services/forecastService';
import { saveReportToCloud, fetchReportsFromCloud, syncUserProfile } from '@services/supabaseSync';
import { supabase } from '@lib/supabase';
import {
  STORAGE_KEYS,
  DEFAULT_LOCATION,
  FREE_REPORT_LIMIT,
  OFFSHORE_SAFETY,
  REPORT_CONFIG,
  DEMO_ACCOUNTS,
} from '@constants/index';
import type {
  ConditionsStore,
  WizardStore,
  ReportStore,
  AuthStore,
  ForecastStore,
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
            reports:      [report, ...state.reports].slice(0, REPORT_CONFIG.HISTORY_LIMIT),
            activeReport: report,
            isGenerating: false,
          }));
          // Cloud sync — fire and forget (log errors for debugging)
          const userId = useAuthStore.getState().user?.id;
          if (userId) {
            saveReportToCloud(userId, report).catch((err) => {
              console.warn('[NGN] Cloud sync failed:', err?.message ?? err);
            });
          }
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

// ── Demo account helper — auto-grants Pro ────
function getDemoSubscription(email: string) {
  const isDemoAccount = DEMO_ACCOUNTS.some(
    (demo) => email.toLowerCase() === demo.toLowerCase()
  );
  if (isDemoAccount) {
    return { isActive: true, tier: 'angler_annual' as const, expiresAt: '2099-12-31' };
  }
  return { isActive: false, tier: 'free' as const, expiresAt: undefined };
}

// ── Auth Store ────────────────────────────────
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user:      null,
      isLoading: false,

      signIn: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          const session = data.session;
          if (session?.user) {
            const userEmail = session.user.email ?? email;
            const userProfile = {
              id:           session.user.id,
              email:        userEmail,
              fullName:     session.user.user_metadata?.name ?? '',
              reportsUsed:  0,
              subscription: getDemoSubscription(userEmail),
              boatLengthFt: OFFSHORE_SAFETY.DEFAULT_BOAT_LENGTH_FT,
              boatSpeedMph: OFFSHORE_SAFETY.DEFAULT_BOAT_SPEED_MPH,
              homeStation:  '8665530',
              createdAt:    session.user.created_at ?? new Date().toISOString(),
            };
            set({ user: userProfile, isLoading: false });
            // Sync profile to cloud
            syncUserProfile(userProfile).catch(() => {});
          }
        } catch (err: any) {
          set({ isLoading: false });
          throw err;
        }
      },

      signUp: async (email: string, password: string, name?: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name: name ?? '' } },
          });
          if (error) throw error;
          const session = data.session;
          if (session?.user) {
            const signupEmail = session.user.email ?? email;
            set({
              user: {
                id:           session.user.id,
                email:        signupEmail,
                fullName:     name ?? '',
                reportsUsed:  0,
                subscription: getDemoSubscription(signupEmail),
                boatLengthFt: OFFSHORE_SAFETY.DEFAULT_BOAT_LENGTH_FT,
                boatSpeedMph: OFFSHORE_SAFETY.DEFAULT_BOAT_SPEED_MPH,
                homeStation:  '8665530',
                createdAt:    session.user.created_at ?? new Date().toISOString(),
              },
              isLoading: false,
            });
          } else {
            // Email confirmation required
            set({ isLoading: false });
          }
        } catch (err: any) {
          set({ isLoading: false });
          throw err;
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },

      loadUser: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const loadEmail = session.user.email ?? '';
            set({
              user: {
                id:           session.user.id,
                email:        loadEmail,
                fullName:     session.user.user_metadata?.name ?? '',
                reportsUsed:  0,
                subscription: getDemoSubscription(loadEmail),
                boatLengthFt: OFFSHORE_SAFETY.DEFAULT_BOAT_LENGTH_FT,
                boatSpeedMph: OFFSHORE_SAFETY.DEFAULT_BOAT_SPEED_MPH,
                homeStation:  '8665530',
                createdAt:    session.user.created_at ?? new Date().toISOString(),
              },
            });
          }
        } catch {
          // No session — stay logged out
        }
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

// ── Forecast Store ───────────────────────────────
// No persistence — refetches each session
export const useForecastStore = create<ForecastStore>((set) => ({
  forecasts:   [],
  selectedDay: 0,
  isLoading:   false,
  error:       null,

  fetchForecast: async (location: UserLocation) => {
    set({ isLoading: true, error: null });
    try {
      const forecasts = await fetchSpeciesForecast(location);
      set({ forecasts, selectedDay: 0, isLoading: false });
    } catch (err: any) {
      console.warn('[NGN] Forecast fetch error:', err.message);
      set({ error: err.message, isLoading: false });
    }
  },

  setSelectedDay: (index: number) => set({ selectedDay: index }),
}));

// ── Community Store (Pro Angler) ─────────────
import {
  fetchNearbyChat as fetchChat,
  sendChatMessage,
  fetchNearbyPins as fetchPins,
  dropPin as dropPinService,
  removePin as removePinService,
  subscribeToChatRealtime,
  subscribeToPinsRealtime,
  unsubscribeAll,
  isWithinRadius,
} from '@services/communityService';
import type { CommunityStore, ChatMessage, LivePin } from '@app-types/index';

export const useCommunityStore = create<CommunityStore>((set, get) => ({
  messages:      [],
  isLoadingChat: false,
  pins:          [],
  isLoadingPins: false,

  fetchNearbyChat: async (lat: number, lng: number) => {
    set({ isLoadingChat: true });
    try {
      const messages = await fetchChat(lat, lng);
      set({ messages, isLoadingChat: false });
    } catch {
      set({ isLoadingChat: false });
    }
  },

  sendMessage: async (text: string, lat: number, lng: number) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');
    const displayName = user.fullName ?? user.email.split('@')[0];
    const msg = await sendChatMessage(user.id, displayName, text, lat, lng);
    if (msg) {
      set((s) => ({ messages: [msg, ...s.messages] }));
    }
  },

  fetchNearbyPins: async (lat: number, lng: number) => {
    set({ isLoadingPins: true });
    try {
      const pins = await fetchPins(lat, lng);
      set({ pins, isLoadingPins: false });
    } catch {
      set({ isLoadingPins: false });
    }
  },

  dropPin: async (pin) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');
    const displayName = user.fullName ?? user.email.split('@')[0];
    const newPin = await dropPinService(
      user.id,
      displayName,
      pin.lat,
      pin.lng,
      pin.pin_type,
      pin.description,
      pin.species_tag
    );
    if (newPin) {
      set((s) => ({ pins: [newPin, ...s.pins] }));
    }
  },

  removePin: async (pinId: string) => {
    await removePinService(pinId);
    set((s) => ({ pins: s.pins.filter((p) => p.id !== pinId) }));
  },

  subscribeRealtime: (lat: number, lng: number) => {
    subscribeToChatRealtime((msg: ChatMessage) => {
      // Client-side radius check for realtime messages
      if (isWithinRadius(lat, lng, msg.lat, msg.lng)) {
        set((s) => {
          // Deduplicate
          if (s.messages.some((m) => m.id === msg.id)) return s;
          return { messages: [msg, ...s.messages] };
        });
      }
    });
    subscribeToPinsRealtime(
      (pin: LivePin) => {
        if (isWithinRadius(lat, lng, pin.lat, pin.lng)) {
          set((s) => {
            if (s.pins.some((p) => p.id === pin.id)) return s;
            return { pins: [pin, ...s.pins] };
          });
        }
      },
      (pinId: string) => {
        set((s) => ({ pins: s.pins.filter((p) => p.id !== pinId) }));
      }
    );
  },

  unsubscribeRealtime: () => {
    unsubscribeAll();
  },
}));
