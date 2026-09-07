import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import NetInfo from "@react-native-community/netinfo";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Bold,
  Check,
  Cloud,
  Code,
  Download,
  Eye,
  FileCode2,
  FileText,
  Folder,
  HelpCircle,
  Italic,
  List,
  LogIn,
  LogOut,
  MoreHorizontal,
  Plus,
  Quote,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Star,
  Strikethrough,
  Trash2,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react-native";
import { useAuthStore } from "./src/store/auth";
import { useNotesStore, searchNotes } from "./src/store/notes";
import { usePreferences } from "./src/store/preferences";
import { useAlerts } from "./src/store/alerts";
import { NotesList } from "./src/components/NotesList";
import { MarkdownPreview } from "./src/components/MarkdownPreview";
import { applyTheme, colors } from "./src/theme";
import { startAutoSync, syncNow } from "./src/lib/sync";
import {
  billingOverview,
  openBilling,
  registerDevice,
  removeDevice,
} from "./src/lib/billing";
import { exportPdf, exportText, pickNotes } from "./src/lib/noteTools";
import { supabase } from "./src/lib/supabase";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationTheme = () => ({
  ...DarkTheme,
  dark: colors.background === "#090b10",
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
  },
});
const owner = () => useAuthStore.getState().session?.user?.id ?? "guest";

function Header({ title, back, navigation, right }) {
  return (
    <SafeAreaView edges={["top"]} style={s.header}>
      {back && (
        <Pressable style={s.icon} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.text} />
        </Pressable>
      )}
      <Text numberOfLines={1} style={s.headerTitle}>
        {title}
      </Text>
      <View style={{ flex: 1 }} />
      {right}
    </SafeAreaView>
  );
}
function Button({ children, onPress, kind = "primary", disabled = false }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        kind === "outline" && s.buttonOutline,
        kind === "danger" && s.buttonDanger,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          s.buttonText,
          kind !== "primary" && {
            color: kind === "danger" ? colors.danger : colors.text,
          },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}
function Login({ navigation }) {
  const signIn = useAuthStore((x) => x.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    const r = await signIn(email.trim(), password);
    setBusy(false);
    if (r.error) setError(r.error.message);
    else navigation.goBack();
  }
  return (
    <SafeAreaView style={s.auth}>
      <Text style={s.logo}>EchoNotes</Text>
      <Text style={s.authTitle}>Welcome back</Text>
      <Text style={s.muted}>
        Sign in to sync this phone with your other devices.
      </Text>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={s.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.muted}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button disabled={busy} onPress={submit}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <Pressable onPress={() => navigation.navigate("Signup")}>
        <Text style={s.link}>Create account</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
        <Text style={s.link}>Forgot password?</Text>
      </Pressable>
    </SafeAreaView>
  );
}
function Signup({ navigation }) {
  const signUp = useAuthStore((x) => x.signUp);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  async function submit() {
    const r = await signUp(email.trim(), password, name.trim());
    setMsg(r.error?.message ?? "Check your email to verify your account.");
  }
  return (
    <SafeAreaView style={s.auth}>
      <Text style={s.authTitle}>Create account</Text>
      <TextInput
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        placeholder="Email"
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={s.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.muted}
      />
      <Button onPress={submit}>Create account</Button>
      {!!msg && <Text style={s.muted}>{msg}</Text>}
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={s.link}>Back to sign in</Text>
      </Pressable>
    </SafeAreaView>
  );
}
function ForgotPassword({ navigation }) {
  const reset = useAuthStore((x) => x.resetPassword);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <SafeAreaView style={s.auth}>
      <Text style={s.authTitle}>Reset password</Text>
      <Text style={s.muted}>We will email you a secure reset link.</Text>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        placeholder="Email"
        placeholderTextColor={colors.muted}
      />
      <Button
        onPress={async () => {
          const r = await reset(email.trim());
          setMsg(r.error?.message ?? "Reset email sent.");
        }}
      >
        Send reset link
      </Button>
      {!!msg && <Text style={s.muted}>{msg}</Text>}
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={s.link}>Back</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function NoteScreen({ navigation, route }) {
  const notes = useNotesStore((x) => x.notes);
  const create = useNotesStore((x) => x.create);
  const [query, setQuery] = useState("");
  const filter = route?.params?.filter ?? "notes";
  let shown = searchNotes(notes, query).filter((n) =>
    filter === "trash"
      ? n.is_deleted
      : !n.is_deleted &&
        !n.is_archived &&
        (filter === "favorites" ? n.is_favorite : true),
  );
  async function add() {
    const n = await create();
    navigation.navigate("Editor", { id: n.id });
  }
  return (
    <SafeAreaView style={s.page}>
      <View style={s.titleRow}>
        <Text style={s.pageTitle}>
          {filter === "trash"
            ? "Trash"
            : filter === "favorites"
              ? "Favorites"
              : "Notes"}
        </Text>
        <Pressable
          style={s.notificationButton}
          onPress={() => navigation.navigate("Alerts")}
        >
          <Bell color={colors.muted} />
        </Pressable>
      </View>
      <View style={s.search}>
        <Search size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search text or #tag…"
          placeholderTextColor={colors.muted}
          style={s.searchInput}
        />
      </View>
      <NotesList
        notes={shown}
        empty={`No ${filter} yet`}
        onOpen={(n) => navigation.navigate("Editor", { id: n.id })}
      />
      {filter === "notes" && (
        <Pressable onPress={add} style={s.fab}>
          <Plus color="white" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}
const Favorites = (p) => (
  <NoteScreen {...p} route={{ params: { filter: "favorites" } }} />
);
const Trash = (p) => (
  <NoteScreen {...p} route={{ params: { filter: "trash" } }} />
);
function Folders({ navigation }) {
  const folders = useNotesStore((x) => x.folders);
  const notes = useNotesStore((x) => x.notes);
  const create = useNotesStore((x) => x.createFolder);
  const remove = useNotesStore((x) => x.deleteFolder);
  const [name, setName] = useState("");
  return (
    <SafeAreaView style={s.page}>
      <Text style={s.pageTitlePad}>Folders</Text>
      <View style={[s.search, { marginBottom: 12 }]}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New folder name"
          placeholderTextColor={colors.muted}
          style={s.searchInput}
        />
        <Pressable
          onPress={async () => {
            await create(name);
            setName("");
          }}
        >
          <Plus color={colors.primary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.list}>
        {folders.map((f) => (
          <View key={f.id} style={s.cardRow}>
            <Pressable
              style={s.flexRow}
              onPress={() =>
                navigation.navigate("FolderNotes", { id: f.id, name: f.name })
              }
            >
              <Folder color={colors.primary} />
              <View>
                <Text style={s.cardTitle}>{f.name}</Text>
                <Text style={s.small}>
                  {
                    notes.filter((n) => n.folder_id === f.id && !n.is_deleted)
                      .length
                  }{" "}
                  notes
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert("Delete folder?", "Notes will stay in All Notes.", [
                  { text: "Cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => remove(f.id),
                  },
                ])
              }
            >
              <Trash2 color={colors.danger} size={18} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
function FolderNotes({ route, navigation }) {
  const notes = useNotesStore((x) => x.notes).filter(
    (n) => n.folder_id === route.params.id && !n.is_deleted,
  );
  const create = useNotesStore((x) => x.create);
  return (
    <SafeAreaView style={s.page}>
      <Header back navigation={navigation} title={route.params.name} />
      <NotesList
        notes={notes}
        onOpen={(n) => navigation.navigate("Editor", { id: n.id })}
      />
      <Pressable
        style={s.fab}
        onPress={async () => {
          const n = await create(route.params.id);
          navigation.navigate("Editor", { id: n.id });
        }}
      >
        <Plus color="white" />
      </Pressable>
    </SafeAreaView>
  );
}

const FORMAT = [
  { label: "B", before: "**", after: "**", Icon: Bold },
  { label: "I", before: "*", after: "*", Icon: Italic },
  { label: "S", before: "~~", after: "~~", Icon: Strikethrough },
  { label: "H1", before: "# ", after: "" },
  { label: "Quote", before: "> ", after: "", Icon: Quote },
  { label: "List", before: "- ", after: "", Icon: List },
  { label: "Code", before: "```js\n", after: "\n```", Icon: Code },
];
function Editor({ route, navigation }) {
  const notes = useNotesStore((x) => x.notes);
  const folders = useNotesStore((x) => x.folders);
  const note = notes.find((n) => n.id === route.params.id);
  const update = useNotesStore((x) => x.update);
  const trash = useNotesStore((x) => x.trash);
  const restore = useNotesStore((x) => x.restore);
  const permanent = useNotesStore((x) => x.permanentDelete);
  const prefs = usePreferences();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [tagText, setTagText] = useState((note?.tags ?? []).join(", "));
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [preview, setPreview] = useState(
    note?.is_system || prefs.editorMode === "live-preview",
  );
  const [more, setMore] = useState(false);
  const timer = useRef();
  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setTagText((note?.tags ?? []).join(", "));
    setPreview(note?.is_system || prefs.editorMode === "live-preview");
  }, [route.params.id]);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!note)
    return (
      <SafeAreaView style={s.page}>
        <Header back navigation={navigation} title="Note unavailable" />
      </SafeAreaView>
    );
  const save = (patch) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => update(note.id, patch),
      prefs.autosaveDelay,
    );
  };
  const changeContent = (v) => {
    setContent(v);
    save({ title: title.trim() || "Untitled Note", content: v });
  };
  const format = (t) => {
    const chosen = content.slice(selection.start, selection.end);
    const next =
      content.slice(0, selection.start) +
      t.before +
      chosen +
      t.after +
      content.slice(selection.end);
    changeContent(next);
    setSelection({
      start: selection.start + t.before.length,
      end: selection.start + t.before.length + chosen.length,
    });
  };
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header
        back
        navigation={navigation}
        title=""
        right={
          <View style={s.flexRow}>
            <Pressable style={s.icon} onPress={() => setPreview(!preview)}>
              {preview ? (
                <FileCode2 color={colors.primary} />
              ) : (
                <Eye color={colors.muted} />
              )}
            </Pressable>
            <Pressable style={s.icon} onPress={() => setMore(true)}>
              <MoreHorizontal color={colors.text} />
            </Pressable>
          </View>
        }
      />
      {!note.is_system && !preview && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          style={s.toolbar}
        >
          {FORMAT.map((t) => (
            <Pressable key={t.label} onPress={() => format(t)} style={s.tool}>
              {t.Icon ? (
                <t.Icon size={18} color={colors.text} />
              ) : (
                <Text style={s.toolText}>{t.label}</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.editor}
      >
        <TextInput
          editable={!note.is_system}
          multiline
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            save({ title: v.trim() || "Untitled Note", content });
          }}
          style={s.noteTitle}
        />
        {!note.is_system && (
          <>
            <TextInput
              value={tagText}
              onChangeText={setTagText}
              onBlur={() => update(note.id, { tags: tagText.split(",") })}
              placeholder="tags, separated, by commas"
              placeholderTextColor={colors.muted}
              style={s.tagInput}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              <Pressable
                onPress={() => update(note.id, { folder_id: null })}
                style={[s.folderChip, !note.folder_id && s.folderChipActive]}
              >
                <Text style={s.small}>All Notes</Text>
              </Pressable>
              {folders.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => update(note.id, { folder_id: f.id })}
                  style={[
                    s.folderChip,
                    note.folder_id === f.id && s.folderChipActive,
                  ]}
                >
                  <Text style={s.small}>{f.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
        {preview ? (
          <MarkdownPreview content={content} fontSize={prefs.editorFontSize} />
        ) : (
          <TextInput
            multiline
            autoCorrect={prefs.spellCheck}
            textAlignVertical="top"
            value={content}
            selection={selection}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            onChangeText={changeContent}
            placeholder="Start writing…"
            placeholderTextColor={colors.muted}
            style={[s.noteContent, { fontSize: prefs.editorFontSize }]}
          />
        )}
        <Text style={s.small}>
          {content.trim() ? content.trim().split(/\s+/).length : 0} words ·{" "}
          {content.length} characters ·{" "}
          {note.is_system ? "Welcome note" : "Saved offline"}
        </Text>
      </ScrollView>
      <Modal
        transparent
        visible={more}
        animationType="fade"
        onRequestClose={() => setMore(false)}
      >
        <Pressable style={s.modalShade} onPress={() => setMore(false)}>
          <View style={s.sheet}>
            {[
              [
                Star,
                note.is_favorite ? "Remove favorite" : "Add favorite",
                () => update(note.id, { is_favorite: !note.is_favorite }),
              ],
              [
                Download,
                "Export / PDF",
                () => navigation.navigate("Export", { id: note.id }),
              ],
              [
                Share2,
                "Public share link",
                () => navigation.navigate("Share", { id: note.id }),
              ],
              note.is_deleted
                ? [RotateCcw, "Restore note", () => restore(note.id)]
                : [Trash2, "Move to trash", () => trash(note.id)],
              ...(note.is_deleted
                ? [[Trash2, "Delete permanently", () => permanent(note.id)]]
                : []),
            ].map(([Icon, label, action]) => (
              <Pressable
                key={label}
                style={s.menuItem}
                onPress={() => {
                  setMore(false);
                  void action();
                }}
              >
                <Icon
                  color={label.includes("Delete") ? colors.danger : colors.text}
                />
                <Text style={s.value}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ExportScreen({ route, navigation }) {
  const note = useNotesStore((x) =>
    x.notes.find((n) => n.id === route.params.id),
  );
  return (
    <SafeAreaView style={s.page}>
      <Header title="Export note" back navigation={navigation} />
      <View style={s.pad}>
        <Button onPress={() => exportPdf(note)}>Export PDF</Button>
        <Button kind="outline" onPress={() => exportText(note, "md")}>
          Share Markdown (.md)
        </Button>
        <Button kind="outline" onPress={() => exportText(note, "txt")}>
          Share text (.txt)
        </Button>
      </View>
    </SafeAreaView>
  );
}
function ShareScreen({ route, navigation }) {
  const user = useAuthStore((x) => x.session?.user);
  const note = useNotesStore((x) =>
    x.notes.find((n) => n.id === route.params.id),
  );
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    if (!user)
      return Alert.alert("Sign in required", "Sign in to create public links.");
    setBusy(true);
    await syncNow(user.id);
    const shareId =
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    const { error } = await supabase.from("note_shares").upsert({
      share_id: shareId,
      note_id: note.id,
      user_id: user.id,
      title: note.title,
      content: note.content,
      tags: note.tags ?? [],
    });
    setBusy(false);
    if (error) Alert.alert("Could not share", error.message);
    else
      setLink(
        `${process.env.EXPO_PUBLIC_APP_URL ?? "https://echo-note-wine.vercel.app"}/share/${shareId}`,
      );
  }
  return (
    <SafeAreaView style={s.page}>
      <Header title="Share" back navigation={navigation} />
      <View style={s.pad}>
        <Text style={s.value}>Public read-only link</Text>
        <Text style={s.muted}>
          Anyone with the link can view this note, but cannot edit it.
        </Text>
        {!!link && (
          <View style={s.card}>
            <Text selectable style={s.small}>
              {link}
            </Text>
            <Button onPress={() => Clipboard.setStringAsync(link)}>
              Copy link
            </Button>
          </View>
        )}
        <Button disabled={busy} onPress={create}>
          {busy ? "Creating…" : "Create share link"}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function SettingsScreen({ navigation }) {
  const session = useAuthStore((x) => x.session);
  const signOut = useAuthStore((x) => x.signOut);
  const p = usePreferences();
  const status = useNotesStore((x) => x.syncState);
  return (
    <SafeAreaView style={s.page}>
      <Text style={s.pageTitlePad}>Settings</Text>
      <ScrollView contentContainerStyle={s.pad}>
        <Pressable
          style={s.cardRow}
          onPress={() => navigation.navigate(session ? "Profile" : "Login")}
        >
          <User color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.value}>
              {session?.user?.email ?? "Offline guest"}
            </Text>
            <Text style={s.small}>
              {session ? "Profile and account" : "Tap to sign in and sync"}
            </Text>
          </View>
        </Pressable>
        <Row
          label="Theme"
          value={
            p.theme === "system"
              ? "System"
              : p.theme === "light"
                ? "Light"
                : "Dark"
          }
          onPress={() =>
            p.setPreference(
              "theme",
              p.theme === "dark"
                ? "light"
                : p.theme === "light"
                  ? "system"
                  : "dark",
            )
          }
        />
        <Row
          label="Editor mode"
          value={p.editorMode === "live-preview" ? "Live Preview" : "Source"}
          onPress={() =>
            p.setPreference(
              "editorMode",
              p.editorMode === "live-preview" ? "source" : "live-preview",
            )
          }
        />
        <Toggle
          label="Spell check"
          value={p.spellCheck}
          onChange={(v) => p.setPreference("spellCheck", v)}
        />
        <Toggle
          label="Keep data after sign out"
          value={p.keepDataAfterLogout}
          onChange={(v) => p.setPreference("keepDataAfterLogout", v)}
        />
        <Row
          label="Editor font size"
          value={`${p.editorFontSize}px`}
          onPress={() =>
            p.setPreference(
              "editorFontSize",
              p.editorFontSize >= 20 ? 14 : p.editorFontSize + 2,
            )
          }
        />
        <Pressable
          style={s.cardRow}
          onPress={() => session && syncNow(session.user.id)}
        >
          {status === "offline" ? (
            <WifiOff color={colors.warning} />
          ) : (
            <Cloud color={colors.success} />
          )}
          <View>
            <Text style={s.value}>Cloud sync</Text>
            <Text style={s.small}>
              {session ? status : "Sign in to enable"}
            </Text>
          </View>
        </Pressable>
        {session && (
          <>
            <Row
              label="Billing & plan"
              value="Manage"
              onPress={() => navigation.navigate("Billing")}
            />
            <Row
              label="Devices"
              value="Manage"
              onPress={() => navigation.navigate("Devices")}
            />
          </>
        )}
        <Row
          label="Import notes"
          value=".md or .txt"
          onPress={async () => {
            for (const item of await pickNotes()) {
              const n = await useNotesStore.getState().create();
              await useNotesStore.getState().update(n.id, item);
            }
            Alert.alert("Import complete");
          }}
        />
        <Row
          label="Alerts"
          value="Open"
          onPress={() => navigation.navigate("Alerts")}
        />
        <Row
          label="Help & feedback"
          value="Open"
          onPress={() => navigation.navigate("Help")}
        />
        {session ? (
          <Button kind="danger" onPress={() => signOut()}>
            Sign out
          </Button>
        ) : (
          <Button onPress={() => navigation.navigate("Login")}>
            Sign in to sync
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Toggle({ label, value, onChange }) {
  return (
    <View style={s.setting}>
      <Text style={s.value}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}
function Row({ label, value, onPress }) {
  return (
    <Pressable style={s.setting} onPress={onPress}>
      <Text style={s.value}>{label}</Text>
      <Text style={s.small}>{value}</Text>
    </Pressable>
  );
}
function Profile({ navigation }) {
  const user = useAuthStore((x) => x.session?.user);
  const [name, setName] = useState(user?.user_metadata?.full_name ?? "");
  return (
    <SafeAreaView style={s.page}>
      <Header title="Profile" back navigation={navigation} />
      <View style={s.pad}>
        <TextInput
          value={name}
          onChangeText={setName}
          style={s.input}
          placeholder="Full name"
          placeholderTextColor={colors.muted}
        />
        <Text style={s.muted}>{user?.email}</Text>
        <Button
          onPress={async () => {
            const { error } = await supabase.auth.updateUser({
              data: { full_name: name },
            });
            Alert.alert(
              error ? "Could not update" : "Profile updated",
              error?.message,
            );
          }}
        >
          Save profile
        </Button>
      </View>
    </SafeAreaView>
  );
}
function Billing({ navigation }) {
  const user = useAuthStore((x) => x.session?.user);
  const [data, setData] = useState();
  useEffect(() => {
    billingOverview(user.id)
      .then(setData)
      .catch((e) => Alert.alert("Billing", e.message));
  }, []);
  return (
    <SafeAreaView style={s.page}>
      <Header title="Billing" back navigation={navigation} />
      <View style={s.pad}>
        <Text style={s.authTitle}>
          {data?.plan === "pro" ? "Pro" : "Basic"}
        </Text>
        <Text style={s.muted}>
          Basic: 100 cloud notes, 2 devices, 3 share links.{"\n"}Pro: unlimited
          cloud notes, 5 devices, unlimited links.
        </Text>
        <View style={s.card}>
          <Text style={s.value}>Cloud notes: {data?.notes ?? "—"}</Text>
          <Text style={s.value}>Share links: {data?.shares ?? "—"}</Text>
          {data?.periodEnd && (
            <Text style={s.small}>
              Paid through {new Date(data.periodEnd).toLocaleDateString()}
            </Text>
          )}
        </View>
        <Button onPress={openBilling}>
          {data?.plan === "pro" ? "Manage Pro subscription" : "Upgrade to Pro"}
        </Button>
        <Text style={s.small}>
          Billing opens the secure EchoNotes web checkout. Payment secrets never
          enter this app.
        </Text>
      </View>
    </SafeAreaView>
  );
}
function Devices({ navigation }) {
  const user = useAuthStore((x) => x.session?.user);
  const [data, setData] = useState();
  const load = async () => {
    const r = await registerDevice();
    if (r.error) Alert.alert("Device limit", r.error.message);
    setData(await billingOverview(user.id));
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <SafeAreaView style={s.page}>
      <Header title="Synced devices" back navigation={navigation} />
      <ScrollView contentContainerStyle={s.pad}>
        {data?.devices.map((d) => (
          <View key={d.id} style={s.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.value}>{d.device_name}</Text>
              <Text style={s.small}>
                {d.platform}
                {d.device_key === data.currentDeviceKey ? " · This device" : ""}
              </Text>
            </View>
            {d.device_key !== data.currentDeviceKey && (
              <Pressable
                onPress={async () => {
                  await removeDevice(d.id);
                  await load();
                }}
              >
                <X color={colors.danger} />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
function Alerts({ navigation }) {
  const alerts = useAlerts((x) => x.alerts);
  const mark = useAlerts((x) => x.mark);
  const remove = useAlerts((x) => x.remove);
  return (
    <SafeAreaView style={s.page}>
      <Header title="Alerts" back navigation={navigation} />
      <ScrollView contentContainerStyle={s.pad}>
        {!alerts.length && (
          <Text style={s.muted}>
            No alerts yet. Sync and account activity will appear here.
          </Text>
        )}
        {alerts.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => mark(a.id)}
            style={[s.cardRow, !a.read && { borderColor: colors.primary }]}
          >
            <AlertCircle
              color={a.type === "error" ? colors.danger : colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.value}>{a.title}</Text>
              <Text style={s.small}>{a.message}</Text>
            </View>
            <Pressable onPress={() => remove(a.id)}>
              <X color={colors.muted} />
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
function Help({ navigation }) {
  return (
    <SafeAreaView style={s.page}>
      <Header title="Help" back navigation={navigation} />
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={s.authTitle}>How can we help?</Text>
        <Text style={s.muted}>
          EchoNotes saves locally first. Sign in only when you want cloud sync.
          Use #tags in search, organize with folders, and export any note as
          PDF.
        </Text>
        <Button
          kind="outline"
          onPress={() => navigation.navigate("Feedback", { type: "bug" })}
        >
          Report a problem
        </Button>
        <Button
          kind="outline"
          onPress={() => navigation.navigate("Feedback", { type: "feature" })}
        >
          Request a feature
        </Button>
        <View style={s.card}>
          <Text style={s.value}>About EchoNotes</Text>
          <Text style={s.small}>Offline-first. Fast. Simple. Yours.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Feedback({ route, navigation }) {
  const user = useAuthStore((x) => x.session?.user);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const type = route.params.type;
  async function submit() {
    if (!user)
      return Alert.alert(
        "Sign in required",
        "Sign in before sending feedback.",
      );
    const { error } = await supabase.from("feedback_submissions").insert({
      user_id: user.id,
      type,
      title: title.trim(),
      description: description.trim(),
      user_agent: `EchoNotes mobile ${Platform.OS}`,
      page_url: "mobile://settings/help",
    });
    if (error) Alert.alert("Could not send", error.message);
    else {
      Alert.alert("Thank you", "Your feedback was submitted.");
      navigation.goBack();
    }
  }
  return (
    <SafeAreaView style={s.page}>
      <Header
        title={type === "bug" ? "Report a problem" : "Request a feature"}
        back
        navigation={navigation}
      />
      <View style={s.pad}>
        <TextInput
          style={s.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Short title"
          placeholderTextColor={colors.muted}
        />
        <TextInput
          style={[
            s.input,
            { height: 180, textAlignVertical: "top", paddingTop: 14 },
          ]}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="Tell us the details…"
          placeholderTextColor={colors.muted}
        />
        <Button
          disabled={title.trim().length < 3 || description.trim().length < 10}
          onPress={submit}
        >
          Submit
        </Button>
      </View>
    </SafeAreaView>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="Notes"
        component={NoteScreen}
        options={{
          tabBarIcon: (p) => <FileText color={p.color} size={p.size} />,
        }}
      />
      <Tab.Screen
        name="Folders"
        component={Folders}
        options={{
          tabBarIcon: (p) => <Folder color={p.color} size={p.size} />,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={Favorites}
        options={{ tabBarIcon: (p) => <Star color={p.color} size={p.size} /> }}
      />
      <Tab.Screen
        name="Trash"
        component={Trash}
        options={{
          tabBarIcon: (p) => <Trash2 color={p.color} size={p.size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: (p) => <Settings color={p.color} size={p.size} />,
        }}
      />
    </Tab.Navigator>
  );
}
export default function App() {
  const ready = useAuthStore((x) => x.ready);
  const session = useAuthStore((x) => x.session);
  const pending = useAuthStore((x) => x.pendingMerge);
  const merge = useAuthStore((x) => x.mergeGuest);
  const selectedTheme = usePreferences((x) => x.theme);
  const systemTheme = useColorScheme();
  const [activeTheme, setActiveTheme] = useState("dark");
  useEffect(() => {
    const resolved =
      selectedTheme === "system" ? (systemTheme ?? "dark") : selectedTheme;
    applyTheme(resolved);
    s = createStyles();
    setActiveTheme(resolved);
  }, [selectedTheme, systemTheme]);
  useEffect(() => {
    let auth;
    void usePreferences.getState().initialize();
    useAuthStore
      .getState()
      .initialize()
      .then((x) => (auth = x));
    return () => auth?.unsubscribe();
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = session?.user?.id ?? "guest";
    void useNotesStore.getState().load(id);
    void useAlerts.getState().load(id);
    let stop;
    if (session)
      registerDevice().then((result) => {
        if (result.error)
          Alert.alert("This device cannot sync", result.error.message);
        else stop = startAutoSync(session.user.id);
      });
    return () => stop?.();
  }, [ready, session?.user?.id]);
  useEffect(() => {
    if (pending)
      Alert.alert(
        "Local notes found",
        "Merge notes written before sign-in into this account?",
        [
          { text: "Keep separate", onPress: () => merge(false) },
          { text: "Merge", onPress: () => merge(true) },
        ],
      );
  }, [pending]);
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <StatusBar style={activeTheme === "light" ? "dark" : "light"} />
      <NavigationContainer theme={navigationTheme()}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={Tabs} />
          <Stack.Screen name="Editor" component={Editor} />
          <Stack.Screen name="FolderNotes" component={FolderNotes} />
          <Stack.Screen name="Export" component={ExportScreen} />
          <Stack.Screen name="Share" component={ShareScreen} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Signup" component={Signup} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="Billing" component={Billing} />
          <Stack.Screen name="Devices" component={Devices} />
          <Stack.Screen name="Alerts" component={Alerts} />
          <Stack.Screen name="Help" component={Help} />
          <Stack.Screen name="Feedback" component={Feedback} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const createStyles = () =>
  StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    page: { flex: 1, backgroundColor: colors.background },
    header: {
      height: 92,
      paddingHorizontal: 12,
      paddingBottom: 8,
      flexDirection: "row",
      alignItems: "flex-end",
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 11,
    },
    icon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    auth: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    logo: {
      color: colors.primary,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 28,
    },
    authTitle: { color: colors.text, fontSize: 28, fontWeight: "800" },
    muted: { color: colors.muted, lineHeight: 21, marginTop: 8 },
    small: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    value: { color: colors.text, fontWeight: "600" },
    error: { color: colors.danger, marginTop: 10 },
    link: { color: colors.primary, textAlign: "center", marginTop: 18 },
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      color: colors.text,
      paddingHorizontal: 15,
      marginTop: 12,
      backgroundColor: colors.surface,
    },
    button: {
      height: 50,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
    },
    buttonOutline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDanger: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.danger + "66",
    },
    buttonText: { color: "white", fontWeight: "800" },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 14,
    },
    notificationButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      marginRight: -8,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    pageTitle: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "800",
      marginTop: 3,
    },
    pageTitlePad: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "800",
      padding: 18,
    },
    search: {
      height: 46,
      marginHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { color: colors.text, flex: 1 },
    fab: {
      position: "absolute",
      right: 22,
      bottom: 22,
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      elevation: 8,
    },
    list: { padding: 16, gap: 10 },
    pad: { padding: 18, paddingBottom: 80 },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 15,
      padding: 16,
      marginTop: 14,
    },
    cardRow: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 15,
      padding: 15,
      marginBottom: 10,
    },
    cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    flexRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 13 },
    setting: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    tabs: {
      flexGrow: 0,
      height: 43,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    tab: {
      height: 42,
      maxWidth: 190,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      borderBottomWidth: 2,
      borderColor: "transparent",
    },
    activeTab: { borderColor: colors.primary, backgroundColor: colors.raised },
    tabText: { color: colors.text, fontSize: 12, maxWidth: 140 },
    toolbar: {
      flexGrow: 0,
      height: 48,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    tool: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
    },
    toolText: { color: colors.text, fontWeight: "800" },
    editor: { padding: 20, paddingBottom: 260 },
    noteTitle: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "800",
      padding: 0,
    },
    tagInput: {
      color: colors.primary,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      marginVertical: 8,
    },
    folderChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginRight: 7,
    },
    folderChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "22",
    },
    noteContent: {
      color: colors.text,
      lineHeight: 25,
      minHeight: 520,
      padding: 0,
      marginTop: 18,
    },
    modalShade: {
      flex: 1,
      backgroundColor: "#0009",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.raised,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 18,
      paddingBottom: 40,
    },
    menuItem: {
      height: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
  });
let s = createStyles();
