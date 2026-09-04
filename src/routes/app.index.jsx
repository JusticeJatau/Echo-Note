import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/app/")({
  component: () => (
    <Workspace
      title="All Notes"
      filter={(note) => !note.is_deleted}
      emptyTitle="No notes yet"
      emptyHint="Create your first note — it saves instantly on this device."
    />
  ),
});
