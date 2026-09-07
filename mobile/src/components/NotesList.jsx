import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, FileText, Star } from "lucide-react-native";
import { useAppTheme } from "../theme/ThemeProvider";
export function NotesList({
  notes,
  empty = "No notes yet",
  onOpen,
  selectedIds = [],
  onToggleSelection,
}) {
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
      renderItem={({ item }) => {
        const selected = selectedIds.includes(item.id);
        const selecting = selectedIds.length > 0;
        return (
          <Pressable
            onLongPress={() => !item.is_system && onToggleSelection?.(item)}
            onPress={() =>
              selecting && !item.is_system
                ? onToggleSelection?.(item)
                : onOpen?.(item)
            }
            style={[styles.card, selected && styles.selectedCard]}
          >
            {selecting && (
              <View
                style={[
                  styles.selectionCircle,
                  selected && styles.selectionCircleActive,
                ]}
              >
                {selected && <Check size={13} color="white" />}
              </View>
            )}
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
        );
      }}
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
    selectedCard: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    selectionCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    selectionCircleActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
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
