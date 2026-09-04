import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";
import { useEcho } from "@/store/echo";

export const Route = createFileRoute("/app/folders/$folderId")({
  component: FolderView,
});

function FolderView() {
  const { folderId } = Route.useParams();
  const folder = useEcho((s) => s.folders.find((f) => f.id === folderId));

  return (
    <Workspace
      title={folder?.name ?? "Folder"}
      folderId={folderId}
      filter={(note) => note.folder_id === folderId && !note.is_deleted}
      emptyTitle="Nothing in this folder"
      emptyHint="Create a note here to get started."
    />
  );
}
