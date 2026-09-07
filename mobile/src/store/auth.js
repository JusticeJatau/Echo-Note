import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { clearWorkspace, copyWorkspace, listLocalNotes } from "../db/database";
import { usePreferences } from "./preferences";

export const useAuthStore=create((set,get)=>({
  session:null,ready:false,pendingMerge:false,
  initialize:async()=>{const{data}=await supabase.auth.getSession();set({session:data.session,ready:true});return supabase.auth.onAuthStateChange((_event,session)=>set({session,ready:true})).data.subscription},
  signIn:async(email,password)=>{const result=await supabase.auth.signInWithPassword({email,password});if(!result.error&&result.data.user){const guest=(await listLocalNotes("guest")).filter(n=>!n.is_system);set({pendingMerge:guest.length>0})}return result},
  signUp:(email,password,name)=>supabase.auth.signUp({email,password,options:{data:{full_name:name}}}),
  resetPassword:(email)=>supabase.auth.resetPasswordForEmail(email,{redirectTo:`${process.env.EXPO_PUBLIC_APP_URL??"https://echo-note-wine.vercel.app"}/reset-password`}),
  mergeGuest:async(merge)=>{const user=get().session?.user;if(user&&merge){await copyWorkspace("guest",user.id);const{useNotesStore}=await import("./notes");await useNotesStore.getState().load(user.id);const{syncNow}=await import("../lib/sync");void syncNow(user.id)}set({pendingMerge:false})},
  signOut:async()=>{const userId=get().session?.user?.id;const keep=usePreferences.getState().keepDataAfterLogout;const result=await supabase.auth.signOut();if(!result.error&&userId&&!keep)await clearWorkspace(userId);set({session:null});return result},
}));
