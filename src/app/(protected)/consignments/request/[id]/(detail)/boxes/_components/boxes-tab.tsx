"use client";

import { useConsignmentPermissions } from "../../../../_hooks/use-consignment-permissions";
import { useConsignmentRequest } from "../../../../_hooks/use-consignment-request";
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
/** Detail receiver fields are loosely typed; normalise to string | null. */
function toText(value: unknown): string | null {
  return value === null || value === undefined || value === "" ? null : String(value);
}

export function BoxesTab({ id }: { id: number }) {
  const { canUpdate } = useConsignmentPermissions();
  // The same cached record the detail page already loaded — the box weight
  // check needs its routing and receiver address.
  const request = useConsignmentRequest(id).data?.request;

  return (
    <BoxesManager
      consignmentId={id}
      shipmentContext={
        request
          ? {
              routing: {
                viaCode: request.via_code ?? "",
                integratorCode: request.integrator_code ?? "",
                packageType: request.package_type ?? "",
              },
              receiver: {
                country: toText(request.receiver?.receiver_country),
                state: toText(request.receiver?.receiver_state),
                city: toText(request.receiver?.receiver_city),
                zip: toText(request.receiver?.receiver_zip),
              },
            }
          : undefined
      }
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
