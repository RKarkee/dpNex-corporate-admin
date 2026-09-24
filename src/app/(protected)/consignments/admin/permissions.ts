/**
 * The permission names the Consignment Admin module checks. Plain data, no
 * directive.
 *
 * **This file must not be `"use client"`.** It is imported by the Server
 * Component pages *and* by the client hook. When a Server Component imports
 * from a `"use client"` module, Next replaces every export with a
 * client-reference proxy — a component still renders, but a plain array comes
 * back as an opaque object and spreading it throws at runtime. Constants shared
 * across the boundary belong in a module with no directive at all.
 *
 * Each capability lists aliases because the backend's vocabulary is not
 * settled, and `RequirePermission` *redirects* rather than hiding — so one
 * wrong guess makes the whole section look unbuilt. `canAny` means one grant is
 * enough; the API is what actually enforces access.
 *
 * Deliberately separate from the Consignment Request module's list: these are
 * different resources, and the day they need different grants this file is
 * where that happens.
 */
export const CONSIGNMENT_ADMIN_PERMISSIONS: {
  view: string[];
  create: string[];
  update: string[];
  delete: string[];
  updateStatus: string[];
  addCharges: string[];
  updateCharges: string[];
} = {
  // `approve_consignment` is the grant the sidebar already uses for this
  // section, so anyone who can reach the nav entry can open the list.
  view: ["view_any_consignment", "approve_consignment", "view_consignment"],
  create: ["create_consignment", "add_consignment"],
  update: ["update_consignment", "edit_consignment", "approve_consignment"],
  delete: ["delete_consignment", "destroy_consignment"],
  // Moving a consignment's status directly.
  // The status-specific grants, plus the plain update grants: the Locations
  // tab — which also moves the status — is gated on those, and the corporate
  // role may carry only them. One grant is enough; the API decides.
  updateStatus: ["update_consignment_status", "update_tracking_status", "update_consignment", "edit_consignment", "approve_consignment"],
  addCharges: ["add_consignment_charges"],
  // Also gates deleting a charge — no separate delete grant is published.
  updateCharges: ["update_consignment_charges"],
};
