import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/app/favorites")({
  component: () => (
    <Workspace
      title="Favorites"
      filter={(note) => note.is_favorite && !note.is_deleted}
      emptyTitle="No favorites yet"
      emptyHint="Star a note to keep it close at hand."
    />
  ),
});
