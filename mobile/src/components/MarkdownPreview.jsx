import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
const inline = (value, key, s) => {
  const parts = value.split(/(\*\*.+?\*\*|~~.+?~~|`.+?`|\*.+?\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return (
        <Text key={`${key}-${i}`} style={s.bold}>
          {p.slice(2, -2)}
        </Text>
      );
    if (p.startsWith("~~") && p.endsWith("~~"))
      return (
        <Text key={`${key}-${i}`} style={s.strike}>
          {p.slice(2, -2)}
        </Text>
      );
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <Text key={`${key}-${i}`} style={s.codeInline}>
          {p.slice(1, -1)}
        </Text>
      );
    if (p.startsWith("*") && p.endsWith("*"))
      return (
        <Text key={`${key}-${i}`} style={s.italic}>
          {p.slice(1, -1)}
        </Text>
      );
    return p;
  });
};
export function MarkdownPreview({ content, fontSize = 16 }) {
  const s = createStyles();
  let inCode = false;
  return (
    <View>
      {content.split("\n").map((line, i) => {
        if (line.startsWith("```")) {
          inCode = !inCode;
          return <View key={i} style={{ height: inCode ? 8 : 2 }} />;
        }
        if (inCode)
          return (
            <Text key={i} selectable style={[s.code, { fontSize }]}>
              {line || " "}
            </Text>
          );
        const h = line.match(/^(#{1,3})\s+(.+)/);
        if (h)
          return (
            <Text
              key={i}
              selectable
              style={[s.heading, { fontSize: fontSize + 10 - h[1].length * 2 }]}
            >
              {inline(h[2], i, s)}
            </Text>
          );
        if (line.startsWith("> "))
          return (
            <Text key={i} selectable style={[s.quote, { fontSize }]}>
              {inline(line.slice(2), i, s)}
            </Text>
          );
        const task = line.match(/^- \[([ xX])\] (.*)/);
        if (task)
          return (
            <Text key={i} selectable style={[s.line, { fontSize }]}>
              {task[1] === " " ? "☐" : "☑"} {inline(task[2], i, s)}
            </Text>
          );
        if (/^[-*+] /.test(line))
          return (
            <Text key={i} selectable style={[s.line, { fontSize }]}>
              • {inline(line.slice(2), i, s)}
            </Text>
          );
        return (
          <Text key={i} selectable style={[s.line, { fontSize }]}>
            {line ? inline(line, i, s) : " "}
          </Text>
        );
      })}
    </View>
  );
}
const createStyles = () =>
  StyleSheet.create({
    line: { color: colors.text, lineHeight: 25, marginBottom: 4 },
    heading: {
      color: colors.text,
      fontWeight: "800",
      marginTop: 12,
      marginBottom: 7,
    },
    bold: { fontWeight: "800" },
    italic: { fontStyle: "italic" },
    strike: { textDecorationLine: "line-through" },
    codeInline: {
      fontFamily: "monospace",
      color: "#8ed6ff",
      backgroundColor: colors.raised,
    },
    code: {
      fontFamily: "monospace",
      color: "#8ed6ff",
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      lineHeight: 23,
    },
    quote: {
      color: colors.muted,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: 12,
      lineHeight: 25,
      fontStyle: "italic",
    },
  });
