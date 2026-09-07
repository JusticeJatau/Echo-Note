import { create } from "zustand";
import * as Crypto from "expo-crypto";
import { deleteLocalEntity, listLocalFolders, listLocalNotes, saveLocalFolder, saveLocalNote } from "../db/database";
import { WELCOME_NOTE } from "../lib/welcomeNote";

const now=()=>new Date().toISOString();
const normalizeTags=(tags=[])=>[...new Set(tags.map(t=>String(t).trim().replace(/^#/,"").toLowerCase()).filter(Boolean))].slice(0,12);
export const useNotesStore=create((set,get)=>({
  ownerId:"guest",notes:[WELCOME_NOTE],folders:[],openedNoteIds:[WELCOME_NOTE.id],activeNoteId:WELCOME_NOTE.id,loading:false,syncState:"offline",lastSyncedAt:null,
  load:async(ownerId)=>{set({loading:true,ownerId});const [notes,folders]=await Promise.all([listLocalNotes(ownerId),listLocalFolders(ownerId)]);set({notes:[WELCOME_NOTE,...notes.filter(n=>n.id!==WELCOME_NOTE.id)],folders,loading:false,activeNoteId:WELCOME_NOTE.id,openedNoteIds:[WELCOME_NOTE.id]})},
  create:async(folderId=null)=>{const ownerId=get().ownerId;const stamp=now();const note={id:Crypto.randomUUID(),title:"Untitled Note",content:"",tags:[],folder_id:folderId,is_favorite:false,is_archived:false,is_deleted:false,is_system:false,created_at:stamp,updated_at:stamp};await saveLocalNote(note,ownerId);set(s=>({notes:[note,...s.notes],activeNoteId:note.id,openedNoteIds:[...new Set([...s.openedNoteIds,note.id])]}));return note},
  update:async(id,patch)=>{const current=get().notes.find(n=>n.id===id);if(!current||current.is_system)return;const note={...current,...patch,tags:patch.tags?normalizeTags(patch.tags):current.tags,updated_at:now()};await saveLocalNote(note,get().ownerId);set(s=>({notes:s.notes.map(n=>n.id===id?note:n)}));return note},
  createFolder:async(name)=>{const clean=name.trim();if(!clean)return;const stamp=now();const folder={id:Crypto.randomUUID(),name:clean,color:null,created_at:stamp,updated_at:stamp};await saveLocalFolder(folder,get().ownerId);set(s=>({folders:[...s.folders,folder].sort((a,b)=>a.name.localeCompare(b.name))}));return folder},
  deleteFolder:async(id)=>{for(const note of get().notes.filter(n=>n.folder_id===id&&!n.is_system))await get().update(note.id,{folder_id:null});await deleteLocalEntity(get().ownerId,"folder",id);set(s=>({folders:s.folders.filter(f=>f.id!==id)}))},
  trash:async(id)=>get().update(id,{is_deleted:true}),restore:async(id)=>get().update(id,{is_deleted:false}),permanentDelete:async(id)=>{await deleteLocalEntity(get().ownerId,"note",id);set(s=>({notes:s.notes.filter(n=>n.id!==id),openedNoteIds:s.openedNoteIds.filter(x=>x!==id),activeNoteId:s.activeNoteId===id?WELCOME_NOTE.id:s.activeNoteId}))},
  openTab:(id)=>set(s=>({activeNoteId:id,openedNoteIds:[...new Set([...s.openedNoteIds,id])]})),closeTab:(id)=>set(s=>{const opened=s.openedNoteIds.filter(x=>x!==id);return{openedNoteIds:opened.length?opened:[WELCOME_NOTE.id],activeNoteId:s.activeNoteId===id?(opened.at(-1)??WELCOME_NOTE.id):s.activeNoteId}}),
  setSync:(syncState,lastSyncedAt=get().lastSyncedAt)=>set({syncState,lastSyncedAt}),replaceCloud:(notes,folders)=>set({notes:[WELCOME_NOTE,...notes.filter(n=>n.id!==WELCOME_NOTE.id)],folders}),
}));

export const searchNotes=(notes,query)=>{const q=query.trim().toLowerCase();if(!q)return notes;if(q.startsWith("#"))return notes.filter(n=>(n.tags??[]).some(t=>t.includes(q.slice(1))));return notes.filter(n=>(n.title+n.content+(n.tags??[]).join(" ")).toLowerCase().includes(q))};
