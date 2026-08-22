"use client";

import { useConsignmentPermissions } from "../../../../_hooks/use-consignment-permissions";
import { BoxesManager } from "./boxes-manager";

/**
 * The Boxes tab — the boxes on this request, each expanding to its items.
 *
 * A thin shell over `BoxesManager`, which owns the whole surface: a paginated
 * list, a detail dialog, and create / update / delete for boxes and for the
 * items nested inside them. All of that already existed; until now it rendered
 * inline at the bottom of the Overview panel, where it competed with the
 * request's own fields and was easy to miss on a long record.
 *
 * Permissions are resolved here rather than inside the manager, so the same
 * table can be rendered read-only elsewhere by passing different flags. One
 * `canUpdate` gates every write: the API has no finer grain than "may edit this
 * request", and pretending otherwise would imply a distinction the backend does
 * not make.
 */
export function BoxesTab({ id }: { id: number }) {
  const { canUpdate } = useConsignmentPermissions();

  return (
    <BoxesManager
      consignmentId={id}
      permissions={{
        canAddBoxes: canUpdate,
        canUpdateBoxes: canUpdate,
        canDeleteBoxes: canUpdate,
        canAddItems: canUpdate,
        canUpdateItems: canUpdate,
        canDeleteItems: canUpdate,
      }}
    />
  );
}
