import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { FileText, Star } from "lucide-react-native";
import { useAppTheme } from "../theme/ThemeProvider";
export function NotesList({ notes, empty = "No notes yet", onOpen }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <FlatList
      data={notes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={notes.length ? styles.list : styles.empty}
      ListEmptyComponent={
        <View style={{ alignItems: "center" }}>
          <FileText color={colors.muted} size={36} />
          <Text style={styles.emptyText}>{empty}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => onOpen?.(item)} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.title}>
              {item.title || "Untitled Note"}
            </Text>
            <Text numberOfLines={2} style={styles.preview}>
              {item.content || "Start writing…"}
            </Text>
            <Text style={styles.date}>
              {new Date(item.updated_at).toLocaleDateString()}
            </Text>
          </View>
          {item.is_favorite && (
            <Star size={16} color={colors.warning} fill={colors.warning} />
          )}
        </Pressable>
      )}
    />
  );
}
const createStyles = (colors) =>
  StyleSheet.create({
    list: { padding: 16, paddingBottom: 110, gap: 10 },
    empty: { flexGrow: 1, justifyContent: "center" },
    emptyText: { color: colors.muted, marginTop: 12 },
    card: {
      flexDirection: "row",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 15,
      padding: 16,
    },
    title: { color: colors.text, fontWeight: "700", fontSize: 16 },
    preview: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },
    date: { color: colors.muted, fontSize: 11, marginTop: 9 },
  });
