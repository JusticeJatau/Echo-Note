import { create } from "zustand";
import { getPreference, setPreference } from "../db/database";
const defaults={theme:"dark",editorFontSize:16,editorMode:"live-preview",spellCheck:true,autosaveDelay:500,notifications:false,keepDataAfterLogout:false,language:"en"};
export const usePreferences=create((set)=>({...defaults,ready:false,initialize:async()=>{const saved=await getPreference("settings",defaults);set({...defaults,...saved,ready:true})},setPreference:async(key,value)=>{set({[key]:value});const state=usePreferences.getState();await setPreference("settings",Object.fromEntries(Object.keys(defaults).map(k=>[k,state[k]])))}}));
