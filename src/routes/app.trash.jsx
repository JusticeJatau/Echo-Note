import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/app/trash")({
  component: () => (
    <Workspace
      title="Trash"
      variant="trash"
      filter={(note) => note.is_deleted}
      emptyTitle="Trash is empty"
      emptyHint="Deleted notes stay here until you remove them permanently."
    />
  ),
});
