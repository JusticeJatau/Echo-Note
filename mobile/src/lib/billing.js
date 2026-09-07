import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { supabase } from "./supabase";
const DEVICE_KEY="echonotes-device-key";
export async function deviceIdentity(){let key=await SecureStore.getItemAsync(DEVICE_KEY);if(!key){key=Crypto.randomUUID();await SecureStore.setItemAsync(DEVICE_KEY,key)}return{key,name:Device.deviceName||`${Platform.OS} device`,platform:`${Platform.OS} ${Platform.Version}`}}
export async function registerDevice(){const d=await deviceIdentity();return supabase.rpc("register_device",{p_device_key:d.key,p_device_name:d.name,p_platform:d.platform})}
export async function billingOverview(userId){const d=await deviceIdentity();const[sub,devices,notes,shares]=await Promise.all([supabase.from("subscriptions").select("*").eq("user_id",userId).maybeSingle(),supabase.from("user_devices").select("*").eq("user_id",userId).order("last_seen_at",{ascending:false}),supabase.from("notes").select("id",{count:"exact",head:true}).eq("user_id",userId).eq("is_deleted",false),supabase.from("note_shares").select("share_id",{count:"exact",head:true}).eq("user_id",userId)]);const error=sub.error||devices.error||notes.error||shares.error;if(error)throw error;const paid=sub.data?.current_period_end&&new Date(sub.data.current_period_end)>new Date();const plan=sub.data?.plan==="pro"&&(sub.data.status==="active"||paid)?"pro":"basic";return{plan,status:sub.data?.status??"active",periodEnd:sub.data?.current_period_end,devices:devices.data??[],currentDeviceKey:d.key,notes:notes.count??0,shares:shares.count??0}}
export async function removeDevice(id){return supabase.from("user_devices").delete().eq("id",id)}

const APP_URL=(process.env.EXPO_PUBLIC_APP_URL??"https://echo-note-wine.vercel.app").replace(/\/$/,"");
async function billingRequest(payload){
  const{data:{session},error}=await supabase.auth.getSession();
  if(error||!session?.access_token)throw new Error("Sign in again before opening billing.");
  const response=await fetch(`${APP_URL}/api/mobile/billing`,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const raw=await response.text();
  let data={};
  try{data=raw?JSON.parse(raw):{}}catch{}
  if(!response.ok)throw new Error(data.error??data.message??(raw&&!raw.startsWith("<")?raw:`Billing request failed (${response.status} ${response.statusText}).`));
  return data;
}
export async function startCheckout(interval){
  const returnUrl=Linking.createURL("billing/callback");
  const checkout=await billingRequest({action:"checkout",interval,returnUrl});
  const result=await WebBrowser.openAuthSessionAsync(checkout.authorizationUrl,returnUrl);
  if(result.type!=="success")return{ok:false,cancelled:true};
  const reference=new URL(result.url).searchParams.get("reference")||checkout.reference;
  if(!reference)throw new Error("Paystack returned without a payment reference.");
  return billingRequest({action:"verify",reference});
}
export async function manageSubscription(){
  const{url}=await billingRequest({action:"manage"});
  if(!url)throw new Error("Paystack did not return a subscription management link.");
  return WebBrowser.openBrowserAsync(url);
}
