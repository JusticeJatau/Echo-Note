import { useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft, Check, ClipboardCopy, Copy, Crown, Laptop, Link, LockKeyhole, QrCode, Radio, ScanLine,
  Send, ShieldCheck, Smartphone, Trash2, Wifi, X,
} from "lucide-react-native";
import { useNearbyClipboard } from "../clipboard/NearbyClipboardProvider";
import { useAppTheme } from "../theme/ThemeProvider";
import { useAuthStore } from "../store/auth";

const ago = (value) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString();
};

export function NearbyClipboardScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bridge = useNearbyClipboard();
  const session = useAuthStore((state) => state.session);
  const [scanner, setScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [notice, setNotice] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();

  const run = async (action, success) => {
    try { await action(); if (success) setNotice({ title: success, message: "The action completed successfully." }); }
    catch (error) { setNotice({ title: "Could not complete that action", message: error instanceof Error ? error.message : String(error) }); }
  };
  const openScanner = async () => {
    const current = permission?.granted ? permission : await requestPermission();
    if (!current.granted) return setNotice({ title: "Camera permission needed", message: "Allow camera access so EchoNotes can scan the pairing QR displayed by the Windows bridge." });
    setScanned(false); setScanner(true);
  };
  const onScan = ({ data }) => {
    if (scanned) return;
    setScanned(true); setScanner(false);
    void run(() => bridge.pairFromQr(data));
  };

  const connected = bridge.status.state === "connected";
  const activePeer = bridge.peers.find((peer) => bridge.status.message.includes(peer.name));
  if (!bridge.entitlement.ready) {
    return <SafeAreaView style={styles.page}><ClipboardHeader navigation={navigation} styles={styles} colors={colors} connected={false} /><View style={styles.gateLoading}><ActivityIndicator color={colors.primary} /><Text style={styles.dialogText}>Checking your plan…</Text></View></SafeAreaView>;
  }
  if (!bridge.entitlement.isPro) {
    return (
      <SafeAreaView style={styles.page}>
        <ClipboardHeader navigation={navigation} styles={styles} colors={colors} connected={false} />
        <ScrollView contentContainerStyle={styles.gateContent}>
          <View style={styles.gateHero}>
            <View style={styles.gateLock}><LockKeyhole color={colors.primary} size={32} /></View>
            <View style={styles.proBadge}><Crown color={colors.primary} size={13} /><Text style={styles.proBadgeText}>ECHONOTES PRO</Text></View>
            <Text style={styles.gateTitle}>Clipboard Sync is a Pro feature</Text>
            <Text style={styles.gateLead}>Copy text, links and code on your phone and paste them on your Windows PC through local Wi-Fi or hotspot—without using the internet.</Text>
            <View style={styles.gateFeatures}>
              <GateFeature styles={styles} colors={colors} text="Encrypted phone-to-PC clipboard transfer" />
              <GateFeature styles={styles} colors={colors} text="Works locally without Supabase or mobile data" />
              <GateFeature styles={styles} colors={colors} text="Trusted devices and local clipboard history" />
            </View>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate(session ? "Billing" : "Login")}>
              <Text style={styles.primaryText}>{session ? "Upgrade to Pro" : "Sign in to upgrade"}</Text>
            </Pressable>
            <Text style={styles.gateNote}>The Clipboard Sync screen remains available on Basic, but connecting and transferring require Pro.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.page}>
      <ClipboardHeader navigation={navigation} styles={styles} colors={colors} connected={connected} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Copy color={colors.primary} size={29} /></View>
          <View style={styles.badge}><Radio color={colors.primary} size={12} /><Text style={styles.badgeText}>LOCAL · ENCRYPTED</Text></View>
          <Text style={styles.title}>Copy here. Paste there.</Text>
          <Text style={styles.lead}>Share text, links and code with your Windows PC through the same Wi-Fi or hotspot. Internet and Supabase are not involved.</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={[styles.statusDot, { backgroundColor: connected ? colors.success : bridge.status.state === "error" ? colors.danger : colors.muted }]} />
          <View style={{ flex: 1 }}><Text style={styles.value}>{connected ? "Nearby clipboard connected" : "Nearby clipboard not connected"}</Text><Text style={styles.small}>{bridge.status.message}</Text></View>
          {(bridge.status.state === "connecting") && <ActivityIndicator color={colors.primary} size="small" />}
          <Text style={[styles.local, connected && { color: colors.success }]}>{connected ? "LOCAL" : bridge.status.state.toUpperCase()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Pair or reconnect</Text>
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={openScanner}>
            <View style={styles.actionIcon}><ScanLine color={colors.primary} size={24} /></View>
            <Text style={styles.actionTitle}>Scan PC QR</Text>
            <Text style={styles.actionText}>Open Pair a device in the Windows bridge, then scan its code.</Text>
          </Pressable>
          <Pressable style={[styles.action, !connected && styles.disabledAction]} disabled={!connected} onPress={() => run(bridge.sendCurrentClipboard, "Clipboard sent") }>
            <View style={styles.actionIcon}><Send color={connected ? colors.primary : colors.muted} size={24} /></View>
            <Text style={styles.actionTitle}>Send clipboard</Text>
            <Text style={styles.actionText}>Send the text currently copied on this phone to the connected PC.</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Nearby settings</Text>
        <View style={styles.group}>
          <Setting styles={styles} title="Enable nearby clipboard" text="Maintain a local connection with your trusted PC." value={bridge.settings.enabled} onChange={(enabled) => bridge.updateSettings({ enabled })} colors={colors} />
          <Setting styles={styles} title="Send copied text automatically" text="While EchoNotes is open, new copied text is sent to the connected PC." value={bridge.settings.autoSend} onChange={(autoSend) => bridge.updateSettings({ autoSend })} colors={colors} />
          <Setting styles={styles} title="Auto-copy received text" text="Otherwise received items wait below until you tap Copy." value={bridge.settings.autoCopy} onChange={(autoCopy) => bridge.updateSettings({ autoCopy })} colors={colors} last />
        </View>

        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Trusted PCs</Text>{connected && <Pressable onPress={bridge.disconnect}><Text style={styles.disconnect}>Disconnect</Text></Pressable>}</View>
        {bridge.peers.length ? <View style={styles.devices}>{bridge.peers.map((peer) => (
          <View style={styles.device} key={peer.id}>
            <View style={styles.deviceIcon}><Laptop color={colors.primary} size={21} /></View>
            <View style={{ flex: 1 }}><Text style={styles.value}>{peer.name}</Text><Text style={styles.small}>{peer.endpoint}{activePeer?.id === peer.id && connected ? " · Connected" : " · Trusted"}</Text></View>
            <Pressable style={styles.smallButton} onPress={() => bridge.connectPeer(peer)}><Link color={colors.primary} size={17} /></Pressable>
            <Pressable style={styles.smallButton} onPress={() => run(() => bridge.removePeer(peer.id))}><Trash2 color={colors.danger} size={17} /></Pressable>
          </View>
        ))}</View> : <Empty styles={styles} colors={colors} icon={Laptop} title="No trusted PC yet" text="Install and open EchoNotes Desktop Bridge, choose Pair a device, then scan its QR here." />}

        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Recent clipboard</Text>{bridge.history.length > 0 && <Pressable onPress={() => run(bridge.clearHistory)}><Text style={styles.clear}>Clear</Text></Pressable>}</View>
        {bridge.history.length ? <View style={styles.history}>{bridge.history.map((item) => (
          <View style={styles.historyItem} key={item.id}>
            <View style={styles.historyIcon}>{item.direction === "received" ? <Smartphone color={colors.primary} size={17} /> : <Send color={colors.primary} size={17} />}</View>
            <View style={{ flex: 1 }}><Text style={styles.clipText} numberOfLines={3}>{item.content}</Text><Text style={styles.small}>{item.direction === "received" ? `From ${item.sourceName}` : "Sent from this phone"} · {ago(item.createdAt)}</Text></View>
            <Pressable style={styles.smallButton} onPress={() => run(() => bridge.copyItem(item), "Copied")}><ClipboardCopy color={colors.primary} size={17} /></Pressable>
            <Pressable style={styles.smallButton} onPress={() => run(() => bridge.removeHistory(item.id))}><X color={colors.muted} size={17} /></Pressable>
          </View>
        ))}</View> : <Empty styles={styles} colors={colors} icon={Copy} title="Nothing transferred yet" text="Recent clipboard text from trusted devices will remain locally on this phone." />}

        <View style={styles.privacy}><ShieldCheck color={colors.success} size={21} /><View style={{ flex: 1 }}><Text style={styles.value}>Private by design</Text><Text style={styles.small}>Pairing keys are stored in Android secure storage. Clipboard content is encrypted before it leaves either device.</Text></View></View>
        <Text style={styles.limitNote}>Android allows automatic clipboard monitoring while EchoNotes is active. Reopen the app to reconnect after Android suspends it in the background.</Text>
      </ScrollView>

      <Modal visible={scanner} animationType="slide" onRequestClose={() => setScanner(false)}>
        <View style={styles.scannerPage}>
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={scanned ? undefined : onScan} />
          <SafeAreaView style={styles.scannerOverlay}>
            <View style={styles.scannerTop}><View><Text style={styles.scannerTitle}>Scan Windows bridge</Text><Text style={styles.scannerLead}>Keep the QR inside the frame</Text></View><Pressable style={styles.scannerClose} onPress={() => setScanner(false)}><X color="#fff" /></Pressable></View>
            <View style={styles.scanFrame}><View/><View/><View/><View/></View>
            <Text style={styles.scannerHelp}>Both devices must use the same Wi-Fi or hotspot.</Text>
          </SafeAreaView>
        </View>
      </Modal>
      <PairingModal pairing={bridge.pairing} close={() => bridge.setPairing(null)} styles={styles} colors={colors} />
      <Notice notice={notice} close={() => setNotice(null)} styles={styles} colors={colors} />
    </SafeAreaView>
  );
}

function ClipboardHeader({ navigation, styles, colors, connected }) {
  return <View style={styles.header}><Pressable style={styles.iconButton} onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={23} /></Pressable><View style={styles.headerCopy}><Text style={styles.headerTitle}>Clipboard sync</Text><Text style={styles.headerLead}>Private nearby sharing</Text></View><View style={[styles.liveDot, { backgroundColor: connected ? colors.success : colors.muted }]} /></View>;
}
function GateFeature({ styles, colors, text }) {
  return <View style={styles.gateFeature}><View style={styles.gateCheck}><Check color={colors.success} size={14} /></View><Text style={styles.gateFeatureText}>{text}</Text></View>;
}

function Setting({ styles, colors, title, text, value, onChange, last }) {
  return <View style={[styles.setting, last && { borderBottomWidth: 0 }]}><View style={{ flex: 1 }}><Text style={styles.value}>{title}</Text><Text style={styles.small}>{text}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" /></View>;
}
function Empty({ styles, colors, icon: Icon, title, text }) { return <View style={styles.empty}><Icon color={colors.muted} size={28}/><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.smallCenter}>{text}</Text></View>; }
function PairingModal({ pairing, close, styles, colors }) {
  if (!pairing) return null;
  const done = pairing.state === "approved";
  const failed = pairing.state === "error";
  return <Modal transparent visible animationType="fade" onRequestClose={close}><View style={styles.shade}><View style={styles.dialog}><View style={[styles.dialogIcon, done && { backgroundColor: colors.success + "20" }]}>{done ? <Check color={colors.success}/> : failed ? <X color={colors.danger}/> : <QrCode color={colors.primary}/>}</View><Text style={styles.dialogTitle}>{pairing.state === "confirm" ? "Compare the pairing code" : done ? "PC connected" : failed ? "Pairing failed" : "Connecting to your PC"}</Text>{pairing.state === "confirm" && <><Text style={styles.dialogText}>Confirm this same code in EchoNotes Desktop Bridge.</Text><Text style={styles.code}>{pairing.code}</Text><View style={styles.waiting}><ActivityIndicator color={colors.primary}/><Text style={styles.small}>Waiting for approval on {pairing.peer.name}…</Text></View></>}{pairing.state === "connecting" && <View style={styles.waiting}><ActivityIndicator color={colors.primary}/><Text style={styles.dialogText}>Opening a private local connection…</Text></View>}{done && <Text style={styles.dialogText}>{pairing.peer.name} is now trusted. Clipboard sync is active while EchoNotes is open.</Text>}{failed && <Text style={styles.dialogText}>{pairing.error}</Text>}{(done || failed) && <Pressable style={styles.primaryButton} onPress={close}><Text style={styles.primaryText}>{failed ? "Try again" : "Done"}</Text></Pressable>}</View></View></Modal>;
}
function Notice({ notice, close, styles, colors }) { if (!notice) return null; return <Modal transparent visible animationType="fade" onRequestClose={close}><View style={styles.shade}><View style={styles.dialog}><View style={styles.dialogIcon}><Radio color={colors.primary}/></View><Text style={styles.dialogTitle}>{notice.title}</Text><Text style={styles.dialogText}>{notice.message}</Text><Pressable style={styles.primaryButton} onPress={close}><Text style={styles.primaryText}>Got it</Text></Pressable></View></View></Modal>; }

function createStyles(c) { return StyleSheet.create({
  page:{flex:1,backgroundColor:c.background},header:{minHeight:67,flexDirection:"row",alignItems:"center",paddingHorizontal:14,borderBottomWidth:1,borderColor:c.border,backgroundColor:c.background},iconButton:{width:42,height:42,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:c.surface},headerCopy:{flex:1,marginLeft:12},headerTitle:{color:c.text,fontSize:18,fontWeight:"900"},headerLead:{color:c.muted,fontSize:10,marginTop:2},liveDot:{width:10,height:10,borderRadius:5,marginRight:8},content:{padding:18,paddingBottom:90},hero:{alignItems:"center",borderRadius:24,borderWidth:1,borderColor:c.primary+"45",backgroundColor:c.primarySoft,paddingHorizontal:20,paddingVertical:25},heroIcon:{width:66,height:66,borderRadius:22,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:c.primary+"55",backgroundColor:c.surface,marginBottom:13},badge:{flexDirection:"row",alignItems:"center",gap:5,borderRadius:20,backgroundColor:c.primary+"18",paddingHorizontal:10,paddingVertical:5},badgeText:{color:c.primary,fontSize:9,fontWeight:"900",letterSpacing:1.1},title:{color:c.text,fontSize:24,fontWeight:"900",letterSpacing:-.5,textAlign:"center",marginTop:13},lead:{color:c.muted,fontSize:13,lineHeight:20,textAlign:"center",marginTop:8},statusCard:{minHeight:76,flexDirection:"row",alignItems:"center",gap:11,borderRadius:17,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,paddingHorizontal:14,marginTop:13},statusDot:{width:10,height:10,borderRadius:5},value:{color:c.text,fontSize:14,fontWeight:"800"},small:{color:c.muted,fontSize:11,lineHeight:16,marginTop:3},local:{color:c.muted,fontSize:8,fontWeight:"900",letterSpacing:.8},sectionTitle:{color:c.text,fontSize:13,fontWeight:"900",letterSpacing:.5,marginTop:23,marginBottom:10},sectionRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},disconnect:{color:c.warning,fontSize:11,fontWeight:"800",marginTop:14},clear:{color:c.danger,fontSize:11,fontWeight:"800",marginTop:14},actions:{flexDirection:"row",gap:10},action:{flex:1,minHeight:165,borderRadius:19,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,padding:15},disabledAction:{opacity:.55},actionIcon:{width:46,height:46,borderRadius:15,alignItems:"center",justifyContent:"center",backgroundColor:c.primarySoft,marginBottom:13},actionTitle:{color:c.text,fontSize:15,fontWeight:"800"},actionText:{color:c.muted,fontSize:11,lineHeight:17,marginTop:6},group:{overflow:"hidden",borderRadius:18,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},setting:{minHeight:85,flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:14,borderBottomWidth:1,borderBottomColor:c.border},devices:{gap:9},device:{minHeight:73,flexDirection:"row",alignItems:"center",gap:10,borderRadius:17,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,padding:12},deviceIcon:{width:42,height:42,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:c.primarySoft},smallButton:{width:35,height:35,borderRadius:11,alignItems:"center",justifyContent:"center",backgroundColor:c.raised},history:{gap:8},historyItem:{minHeight:79,flexDirection:"row",alignItems:"center",gap:10,borderRadius:16,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,padding:11},historyIcon:{width:35,height:35,borderRadius:11,alignItems:"center",justifyContent:"center",backgroundColor:c.primarySoft},clipText:{color:c.text,fontSize:12,lineHeight:17},empty:{alignItems:"center",borderRadius:18,borderWidth:1,borderStyle:"dashed",borderColor:c.border,backgroundColor:c.surface,padding:21},emptyTitle:{color:c.text,fontSize:15,fontWeight:"800",marginTop:10,marginBottom:4},smallCenter:{color:c.muted,fontSize:11,lineHeight:17,textAlign:"center"},privacy:{flexDirection:"row",alignItems:"flex-start",gap:11,borderRadius:16,backgroundColor:c.success+"12",borderWidth:1,borderColor:c.success+"35",padding:14,marginTop:20},limitNote:{color:c.muted,fontSize:10,lineHeight:15,textAlign:"center",marginTop:13,paddingHorizontal:8},scannerPage:{flex:1,backgroundColor:"#000"},scannerOverlay:{flex:1,justifyContent:"space-between",padding:20,backgroundColor:"rgba(0,0,0,.26)"},scannerTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},scannerTitle:{color:"#fff",fontSize:20,fontWeight:"900"},scannerLead:{color:"rgba(255,255,255,.72)",fontSize:11,marginTop:4},scannerClose:{width:44,height:44,borderRadius:15,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,.55)"},scanFrame:{width:245,height:245,alignSelf:"center",borderRadius:30,borderWidth:2,borderColor:c.primary,backgroundColor:"transparent"},scannerHelp:{color:"#fff",fontSize:12,lineHeight:18,textAlign:"center",backgroundColor:"rgba(0,0,0,.55)",borderRadius:14,padding:12,marginBottom:15},shade:{flex:1,alignItems:"center",justifyContent:"center",padding:22,backgroundColor:"rgba(0,0,0,.72)"},dialog:{width:"100%",maxWidth:420,alignItems:"center",borderRadius:24,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,padding:22},dialogIcon:{width:54,height:54,borderRadius:18,alignItems:"center",justifyContent:"center",backgroundColor:c.primarySoft},dialogTitle:{color:c.text,fontSize:20,fontWeight:"900",textAlign:"center",marginTop:13},dialogText:{color:c.muted,fontSize:13,lineHeight:20,textAlign:"center",marginTop:8},code:{color:c.text,fontSize:37,fontWeight:"900",letterSpacing:7,marginVertical:18},waiting:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,marginTop:13},primaryButton:{width:"100%",minHeight:47,alignItems:"center",justifyContent:"center",borderRadius:14,backgroundColor:c.primary,marginTop:20},primaryText:{color:"#fff",fontSize:13,fontWeight:"900"},
  gateLoading:{flex:1,alignItems:"center",justifyContent:"center",gap:10,padding:24},gateContent:{flexGrow:1,justifyContent:"center",padding:20,paddingBottom:60},gateHero:{alignItems:"center",borderRadius:26,borderWidth:1,borderColor:c.primary+"45",backgroundColor:c.surface,padding:24},gateLock:{width:72,height:72,borderRadius:24,alignItems:"center",justifyContent:"center",backgroundColor:c.primarySoft,borderWidth:1,borderColor:c.primary+"45"},proBadge:{flexDirection:"row",alignItems:"center",gap:6,borderRadius:20,backgroundColor:c.primary+"18",paddingHorizontal:11,paddingVertical:6,marginTop:17},proBadgeText:{color:c.primary,fontSize:9,fontWeight:"900",letterSpacing:1.1},gateTitle:{color:c.text,fontSize:24,fontWeight:"900",textAlign:"center",marginTop:14},gateLead:{color:c.muted,fontSize:13,lineHeight:20,textAlign:"center",marginTop:9},gateFeatures:{alignSelf:"stretch",gap:11,marginTop:22},gateFeature:{flexDirection:"row",alignItems:"center",gap:10},gateCheck:{width:25,height:25,borderRadius:9,alignItems:"center",justifyContent:"center",backgroundColor:c.success+"18"},gateFeatureText:{flex:1,color:c.text,fontSize:12,lineHeight:18,fontWeight:"700"},gateNote:{color:c.muted,fontSize:10,lineHeight:15,textAlign:"center",marginTop:13},
}); }
