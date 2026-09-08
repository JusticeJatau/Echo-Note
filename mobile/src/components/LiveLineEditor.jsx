import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { CODEMIRROR_RUNTIME } from "../editor/codemirror-runtime";
import { useAppTheme } from "../theme/ThemeProvider";

const safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");

function buildHtml(content, colors, fontSize, spellCheck) {
  const config = safeJson({ content, colors, fontSize, spellCheck });
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>*{box-sizing:border-box}html,body,#editor{height:100%;margin:0;background:${colors.background};overflow:hidden}body{overscroll-behavior:none}</style></head><body><div id="editor"></div><script>${CODEMIRROR_RUNTIME}</script><script>window.EchoNotesEditor.mount(${config});</script></body></html>`;
}

export function LiveLineEditor({ content, selection, onChangeText, onSelectionChange, fontSize = 16, spellCheck = true }) {
  const { colors } = useAppTheme();
  const webRef = useRef(null);
  const latest = useRef(content);
  const ready = useRef(false);
  const html = useMemo(() => buildHtml(content, colors, fontSize, spellCheck), [colors, fontSize, spellCheck]);

  useEffect(() => {
    if (!ready.current || latest.current === content) return;
    latest.current = content;
    webRef.current?.injectJavaScript(`window.EchoNotesEditor.setContent(${safeJson(content)},${selection?.start ?? content.length},${selection?.end ?? selection?.start ?? content.length});true;`);
  }, [content, selection?.start, selection?.end]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        ref={webRef}
        source={{ html }}
        originWhitelist={["*"]}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView
        overScrollMode="never"
        style={{ flex: 1, backgroundColor: colors.background }}
        onMessage={({ nativeEvent }) => {
          try {
            const message = JSON.parse(nativeEvent.data);
            if (message.type === "ready") {
              ready.current = true;
              latest.current = content;
            }
            if (message.type === "selection") onSelectionChange?.(message.selection);
            if (message.type === "change" && message.content !== latest.current) {
              latest.current = message.content;
              onChangeText(message.content);
            }
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { width: "100%", height: 620, minHeight: 520 } });
