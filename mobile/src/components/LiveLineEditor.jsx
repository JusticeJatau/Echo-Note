import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { MarkdownPreview } from "./MarkdownPreview";
import { useAppTheme } from "../theme/ThemeProvider";

export function LiveLineEditor({
  content,
  onChangeText,
  onSelectionChange,
  fontSize = 16,
  spellCheck = true,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors, fontSize),
    [colors, fontSize],
  );
  const lines = content.split("\n");
  const [activeLine, setActiveLine] = useState(Math.max(0, lines.length - 1));
  const inputRef = useRef(null);
  useEffect(
    () =>
      setActiveLine((value) => Math.min(value, Math.max(0, lines.length - 1))),
    [lines.length],
  );
  const prefixAt = (index) =>
    lines.slice(0, index).reduce((total, line) => total + line.length + 1, 0);
  const changeLine = (value) => {
    const parts = value.split("\n");
    const next = [
      ...lines.slice(0, activeLine),
      ...parts,
      ...lines.slice(activeLine + 1),
    ];
    const nextIndex = activeLine + parts.length - 1;
    onChangeText(next.join("\n"));
    if (parts.length > 1) setActiveLine(nextIndex);
  };
  return (
    <View style={styles.container}>
      {lines.map((line, index) =>
        index === activeLine ? (
          <TextInput
            key={`edit-${index}`}
            ref={inputRef}
            autoFocus
            multiline
            value={line}
            onChangeText={changeLine}
            onSelectionChange={(event) => {
              const start = prefixAt(index) + event.nativeEvent.selection.start;
              const end = prefixAt(index) + event.nativeEvent.selection.end;
              onSelectionChange?.({ start, end });
            }}
            autoCorrect={spellCheck}
            placeholder="Start writing…"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        ) : (
          <Pressable
            key={`preview-${index}`}
            style={styles.previewLine}
            onPress={() => setActiveLine(index)}
          >
            <MarkdownPreview content={line} fontSize={fontSize} />
          </Pressable>
        ),
      )}
    </View>
  );
}

const createStyles = (colors, fontSize) =>
  StyleSheet.create({
    container: { minHeight: 520 },
    input: {
      color: colors.text,
      fontSize,
      lineHeight: 25,
      minHeight: 29,
      padding: 0,
      margin: 0,
    },
    previewLine: { minHeight: 29, justifyContent: "center" },
  });
