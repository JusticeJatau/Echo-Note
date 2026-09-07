import { create } from "zustand";
import { supabase } from "../lib/supabase";

export const useAuthStore = create((set) => ({
  session: null, ready: false,
  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, ready: true });
    return supabase.auth.onAuthStateChange((_event, session) => set({ session, ready: true })).data.subscription;
  },
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (email, password, name) => supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }),
  signOut: () => supabase.auth.signOut(),
}));
