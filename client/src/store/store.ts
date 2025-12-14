import create from 'zustand';
import type { State, StaffInfo } from '../interfaces/store.interface';
import { createSelectorFunctions } from 'auto-zustand-selectors-hook';
import { mountStoreDevtool } from 'simple-zustand-devtools';
import envConfig from '../config/environment.config';
import { persist, devtools } from 'zustand/middleware';

// keys of state to be persisted
const whiteList: Array<keyof State> = ['staffInfo', 'tokens', 'isAuthenticated', 'staffSettings'];

const useStoreBase = create<State>()(
  devtools(
    persist(
      (set) => ({
        count: 0,
        staffInfo: null,
        staffSettings: null,
        tokens: null,
        isAuthenticated: false,
        increment: () => set((state) => ({ count: state.count + 1 })),
        decrement: () => set((state) => ({ count: state.count - 1 })),
        loginStaff: ({ accessToken, refreshToken, staff }) => {
          console.log('🔍 loginStaff called with:', { accessToken, refreshToken, staff });
          
          const newState = {
            staffInfo: staff,
            tokens: { accessToken, refreshToken },
            isAuthenticated: true
          };
          
          set(newState);
          
          // Force persist to localStorage immediately
          setTimeout(() => {
            const persisted = localStorage.getItem('bas-persist');
            console.log('🔍 Persisted state after login:', persisted);
          }, 100);
        },
        updateStaffProfile: (profileData: Partial<StaffInfo>) => {
          set((state) => ({
            staffInfo: state.staffInfo ? { ...state.staffInfo, ...profileData } : null
          }));
        },
        logoutStaff: () => {
           set({ isAuthenticated: false, tokens: null, staffInfo: null });
         },
         logout: () => {
           set({ isAuthenticated: false, tokens: null, staffInfo: null });
         },
        setStaffSettings: (settings) => set({ staffSettings: settings }),
      }),
      {
        name: 'bas-persist',
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(([key]) => whiteList.includes(key as keyof State))
          ),
        // Add this to debug persistence
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            console.error('🔴 Failed to rehydrate storage:', error);
          } else {
            console.log('✅ Rehydrated state:', state);
          }
        },
      },
    ),
  ),
);

export const persistApi = useStoreBase.persist;

if (envConfig.isDev) {
  mountStoreDevtool('Store', useStoreBase);
}

const useStore = createSelectorFunctions(useStoreBase);

export default useStore;