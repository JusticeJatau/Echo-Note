import { create } from "zustand";
import * as Crypto from "expo-crypto";
import { deleteAlert, listAlerts, saveAlert, updateAlert } from "../db/database";
export const useAlerts=create((set,get)=>({alerts:[],ownerId:"guest",load:async ownerId=>set({ownerId,alerts:await listAlerts(ownerId)}),add:async(type,title,message)=>{const a={id:Crypto.randomUUID(),type,title,message,read:false,created_at:new Date().toISOString()};await saveAlert(a,get().ownerId);set(s=>({alerts:[a,...s.alerts]}))},mark:async id=>{await updateAlert(id,true);set(s=>({alerts:s.alerts.map(a=>a.id===id?{...a,read:true}:a)}))},remove:async id=>{await deleteAlert(id);set(s=>({alerts:s.alerts.filter(a=>a.id!==id)}))}}));
