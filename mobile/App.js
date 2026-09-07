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
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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
  ChevronDown,
  Cloud,
  Code,
  CreditCard,
  Database,
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
  Palette,
  Plus,
  Quote,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Star,
  Strikethrough,
  Smartphone,
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
import { colors } from "./src/theme";
import { ThemeProvider, useAppTheme } from "./src/theme/ThemeProvider";
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
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const r = await signIn(email.trim(), password);
      if (r.error) return setError(r.error.message);
      setSuccess("Signed in successfully. Preparing your workspace…");
      setTimeout(
        () => navigation.reset({ index: 0, routes: [{ name: "Home" }] }),
        450,
      );
    } catch (requestError) {
      setError(
        requestError?.message ??
          "Could not sign in. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
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
      {!!success && (
        <View style={s.successBox}>
          <Check size={18} color={colors.success} />
          <Text style={s.successText}>{success}</Text>
        </View>
      )}
      <Button disabled={busy} onPress={submit}>
        {success ? "Signed in" : busy ? "Signing in…" : "Sign in"}
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
  const [overview, setOverview] = useState(null);
  useEffect(() => {
    if (session?.user)
      billingOverview(session.user.id)
        .then(setOverview)
        .catch(() => setOverview(null));
    else setOverview(null);
  }, [session?.user?.id]);
  return (
    <SafeAreaView style={s.page}>
      <View style={s.settingsHeader}>
        <Text style={s.pageTitle}>Settings</Text>
        <Text style={s.settingsSubtitle}>Make EchoNotes work your way</Text>
      </View>
      <ScrollView
        contentContainerStyle={s.settingsContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={s.accountCard}
          onPress={() => navigation.navigate(session ? "Profile" : "Login")}
        >
          <View style={s.accountAvatar}>
            <User color={colors.primary} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.accountName}>
              {session?.user?.user_metadata?.full_name ||
                (session ? "Your account" : "Offline guest")}
            </Text>
            <Text style={s.small}>
              {session?.user?.email ?? "Tap to sign in and sync"}
            </Text>
          </View>
          <ChevronDown
            color={colors.muted}
            size={18}
            style={{ transform: [{ rotate: "-90deg" }] }}
          />
        </Pressable>

        {session && (
          <Pressable
            style={s.planCard}
            onPress={() => navigation.navigate("Billing")}
          >
            <View style={s.planTop}>
              <View>
                <Text style={s.planEyebrow}>CURRENT PLAN</Text>
                <Text style={s.planName}>
                  {overview?.plan === "pro"
                    ? "EchoNotes Pro"
                    : "EchoNotes Basic"}
                </Text>
              </View>
              <View style={s.planBadge}>
                <Text style={s.planBadgeText}>
                  {overview?.plan === "pro" ? "PRO" : "FREE"}
                </Text>
              </View>
            </View>
            <Text style={s.planDescription}>
              {overview?.plan === "pro"
                ? "Unlimited cloud notes and public links · 5 devices"
                : "100 cloud notes · 3 public links · 2 devices"}
            </Text>
            <View style={s.planFooter}>
              <Text style={s.planAction}>
                {overview?.plan === "pro"
                  ? "Manage subscription"
                  : "View plans and upgrade"}
              </Text>
              <ChevronDown
                color={colors.primary}
                size={17}
                style={{ transform: [{ rotate: "-90deg" }] }}
              />
            </View>
          </Pressable>
        )}

        <SectionLabel icon={Palette} title="Appearance" />
        <View style={s.settingsGroup}>
          <SelectRow
            label="Theme"
            value={p.theme}
            options={[
              { label: "Dark", value: "dark" },
              { label: "Light", value: "light" },
              { label: "System", value: "system" },
            ]}
            onChange={(value) => p.setPreference("theme", value)}
          />
        </View>

        <SectionLabel icon={FileText} title="Editor" />
        <View style={s.settingsGroup}>
          <SelectRow
            label="Editor mode"
            value={p.editorMode}
            options={[
              { label: "Live Preview", value: "live-preview" },
              { label: "Source", value: "source" },
            ]}
            onChange={(value) => p.setPreference("editorMode", value)}
          />
          <Toggle
            label="Spell check"
            value={p.spellCheck}
            onChange={(v) => p.setPreference("spellCheck", v)}
          />
          <SelectRow
            label="Editor font size"
            value={p.editorFontSize}
            options={[14, 16, 18, 20, 22, 24].map((value) => ({
              label: `${value}px`,
              value,
            }))}
            onChange={(value) => p.setPreference("editorFontSize", value)}
          />
          <SelectRow
            label="Autosave delay"
            value={p.autosaveDelay}
            options={[
              { label: "Instant (250ms)", value: 250 },
              { label: "Normal (500ms)", value: 500 },
              { label: "Relaxed (1000ms)", value: 1000 },
            ]}
            onChange={(value) => p.setPreference("autosaveDelay", value)}
          />
        </View>

        <SectionLabel icon={Database} title="Data and sync" />
        <View style={s.settingsGroup}>
          <Toggle
            label="Keep data after sign out"
            value={p.keepDataAfterLogout}
            onChange={(v) => p.setPreference("keepDataAfterLogout", v)}
          />
          <SelectRow
            label="Language"
            value={p.language}
            options={[{ label: "English", value: "en" }]}
            onChange={(value) => p.setPreference("language", value)}
          />
          <Pressable
            style={s.setting}
            onPress={() => session && syncNow(session.user.id)}
          >
            {status === "offline" ? (
              <WifiOff color={colors.warning} />
            ) : (
              <Cloud color={colors.success} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.value}>Cloud sync</Text>
              <Text style={s.small}>
                {session ? status : "Sign in to enable"}
              </Text>
            </View>
            {session && (
              <ChevronDown
                color={colors.muted}
                size={17}
                style={{ transform: [{ rotate: "-90deg" }] }}
              />
            )}
          </Pressable>
          {session && (
            <NavigationRow
              icon={Smartphone}
              label="Synced devices"
              detail={`${overview?.devices?.length ?? 0} connected`}
              onPress={() => navigation.navigate("Devices")}
            />
          )}
          <NavigationRow
            icon={Download}
            label="Import notes"
            detail="Markdown or text"
            onPress={async () => {
              for (const item of await pickNotes()) {
                const n = await useNotesStore.getState().create();
                await useNotesStore.getState().update(n.id, item);
              }
              Alert.alert("Import complete");
            }}
          />
        </View>

        <SectionLabel icon={HelpCircle} title="Support" />
        <View style={s.settingsGroup}>
          <NavigationRow
            icon={Bell}
            label="Alerts"
            detail="Sync and account activity"
            onPress={() => navigation.navigate("Alerts")}
          />
          <NavigationRow
            icon={HelpCircle}
            label="Help and feedback"
            detail="Guides, problems and ideas"
            onPress={() => navigation.navigate("Help")}
          />
        </View>

        {session ? (
          <Button kind="danger" onPress={() => signOut()}>
            Sign out
          </Button>
        ) : (
          <Button onPress={() => navigation.navigate("Login")}>
            Sign in to sync
          </Button>
        )}
        <Text style={s.settingsVersion}>EchoNotes Mobile · Version 0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
function SectionLabel({ icon: Icon, title }) {
  return (
    <View style={s.sectionLabel}>
      <Icon size={15} color={colors.primary} />
      <Text style={s.sectionLabelText}>{title}</Text>
    </View>
  );
}
function NavigationRow({ icon: Icon, label, detail, onPress }) {
  return (
    <Pressable style={s.setting} onPress={onPress}>
      <View style={s.settingLeading}>
        <View style={s.settingIcon}>
          <Icon size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={s.value}>{label}</Text>
          <Text style={s.small}>{detail}</Text>
        </View>
      </View>
      <ChevronDown
        color={colors.muted}
        size={17}
        style={{ transform: [{ rotate: "-90deg" }] }}
      />
    </Pressable>
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
function SelectRow({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selected =
    options.find((option) => option.value === value) ?? options[0];
  return (
    <>
      <Pressable style={s.setting} onPress={() => setOpen(true)}>
        <Text style={s.value}>{label}</Text>
        <View style={s.selectValue}>
          <Text style={s.small}>{selected?.label}</Text>
          <ChevronDown size={16} color={colors.muted} />
        </View>
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.modalShade} onPress={() => setOpen(false)}>
          <View style={s.selectSheet}>
            <Text style={s.selectTitle}>{label}</Text>
            {options.map((option) => (
              <Pressable
                key={String(option.value)}
                style={[
                  s.selectOption,
                  option.value === value && s.selectedOption,
                ]}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <Text style={s.value}>{option.label}</Text>
                {option.value === value && (
                  <Check size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
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
      <Header title="Plan and billing" back navigation={navigation} />
      <ScrollView
        contentContainerStyle={s.billingContent}
        showsVerticalScrollIndicator={false}
      >
        {!data ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={s.billingHero}>
              <View style={s.billingIcon}>
                <CreditCard color={colors.primary} size={24} />
              </View>
              <Text style={s.planEyebrow}>YOUR CURRENT PLAN</Text>
              <Text style={s.billingPlan}>
                {data.plan === "pro" ? "EchoNotes Pro" : "EchoNotes Basic"}
              </Text>
              <Text style={s.billingLead}>
                {data.plan === "pro"
                  ? "Everything you need, with room to grow."
                  : "All the essentials for personal note-taking."}
              </Text>
              {data.periodEnd && (
                <View style={s.renewalPill}>
                  <Text style={s.small}>
                    Access through{" "}
                    {new Date(data.periodEnd).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={s.billingSectionTitle}>Usage</Text>
            <View style={s.usageGrid}>
              <UsageCard
                label="Cloud notes"
                value={data.notes}
                limit={data.plan === "pro" ? null : 100}
              />
              <UsageCard
                label="Share links"
                value={data.shares}
                limit={data.plan === "pro" ? null : 3}
              />
              <UsageCard
                label="Devices"
                value={data.devices?.length ?? 0}
                limit={data.plan === "pro" ? 5 : 2}
              />
            </View>
            <Text style={s.billingSectionTitle}>
              {data.plan === "pro" ? "Included with Pro" : "Upgrade to Pro"}
            </Text>
            <View style={s.featureCard}>
              <PlanFeature
                text={
                  data.plan === "pro"
                    ? "Unlimited cloud-synced notes"
                    : "Unlimited cloud-synced notes on Pro"
                }
              />
              <PlanFeature
                text={
                  data.plan === "pro"
                    ? "Unlimited public share links"
                    : "Unlimited public share links on Pro"
                }
              />
              <PlanFeature text="Offline editor, folders, tags and PDF export" />
              <PlanFeature
                text={
                  data.plan === "pro"
                    ? "Sync up to 5 devices"
                    : "Sync up to 5 devices on Pro"
                }
              />
            </View>
            <Button onPress={openBilling}>
              {data.plan === "pro"
                ? "Manage Pro subscription"
                : "View Pro plans"}
            </Button>
            <Text style={s.billingNote}>
              Checkout and subscription management open on the secure EchoNotes
              website.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function UsageCard({ label, value, limit }) {
  const progress = limit ? Math.min(1, value / limit) : 1;
  return (
    <View style={s.usageCard}>
      <Text style={s.usageValue}>
        {value}
        {limit ? ` / ${limit}` : ""}
      </Text>
      <Text style={s.small}>{label}</Text>
      <View style={s.usageTrack}>
        <View style={[s.usageFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}
function PlanFeature({ text }) {
  return (
    <View style={s.featureRow}>
      <View style={s.featureCheck}>
        <Check size={14} color={colors.success} />
      </View>
      <Text style={s.featureText}>{text}</Text>
    </View>
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
function AppContent() {
  const { navigationTheme, statusBarStyle } = useAppTheme();
  s = createStyles();
  const ready = useAuthStore((x) => x.ready);
  const session = useAuthStore((x) => x.session);
  const pending = useAuthStore((x) => x.pendingMerge);
  const merge = useAuthStore((x) => x.mergeGuest);
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
    if (session) {
      stop = startAutoSync(session.user.id);
      registerDevice()
        .then((result) => {
          if (result.error?.message?.includes("DEVICE_LIMIT_REACHED")) {
            stop?.();
            useNotesStore.getState().setSync("error");
            Alert.alert(
              "Device limit reached",
              "Remove an old device from Settings before syncing this phone.",
            );
          }
        })
        .catch(() => {});
    }
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
      <StatusBar style={statusBarStyle} />
      <NavigationContainer theme={navigationTheme}>
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

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
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
    successBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.success + "66",
      backgroundColor: colors.success + "12",
    },
    successText: { color: colors.success, flex: 1, fontWeight: "600" },
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
    settingsHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    settingsSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
    settingsContent: { padding: 16, paddingBottom: 110 },
    accountCard: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
    },
    accountAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    accountName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 3,
    },
    planCard: {
      marginTop: 12,
      borderRadius: 18,
      padding: 17,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary + "55",
    },
    planTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    planEyebrow: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
    planName: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      marginTop: 4,
    },
    planBadge: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    planBadgeText: {
      color: "white",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    planDescription: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
    },
    planFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: colors.primary + "33",
      paddingTop: 12,
      marginTop: 13,
    },
    planAction: { color: colors.primary, fontSize: 13, fontWeight: "800" },
    sectionLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 24,
      marginBottom: 8,
      paddingHorizontal: 3,
    },
    sectionLabelText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.9,
      textTransform: "uppercase",
    },
    settingsGroup: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      paddingHorizontal: 14,
      overflow: "hidden",
    },
    settingLeading: { flexDirection: "row", alignItems: "center", gap: 11 },
    settingIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    settingsVersion: {
      color: colors.muted,
      fontSize: 11,
      textAlign: "center",
      marginTop: 20,
    },
    setting: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    selectValue: { flexDirection: "row", alignItems: "center", gap: 7 },
    selectSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 18,
      paddingBottom: 38,
    },
    selectTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "800",
      marginBottom: 10,
    },
    selectOption: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    selectedOption: { backgroundColor: colors.primarySoft },
    billingContent: { padding: 18, paddingBottom: 90 },
    billingHero: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 24,
    },
    billingIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
      marginBottom: 15,
    },
    billingPlan: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "900",
      marginTop: 5,
    },
    billingLead: {
      color: colors.muted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 20,
      marginTop: 8,
    },
    renewalPill: {
      backgroundColor: colors.raised,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginTop: 14,
    },
    billingSectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 24,
      marginBottom: 10,
    },
    usageGrid: { flexDirection: "row", gap: 8 },
    usageCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 15,
      padding: 12,
    },
    usageValue: { color: colors.text, fontSize: 17, fontWeight: "900" },
    usageTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.raised,
      marginTop: 10,
      overflow: "hidden",
    },
    usageFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
    featureCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      padding: 15,
      gap: 13,
    },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    featureCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success + "18",
    },
    featureText: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 19 },
    billingNote: {
      color: colors.muted,
      fontSize: 11,
      textAlign: "center",
      lineHeight: 17,
      marginTop: 12,
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
