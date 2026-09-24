/**
 * The permission names this feature checks. Plain data, no directive.
 *
 * **This file must not be `"use client"`.** It is imported by the Server
 * Component pages (`page.tsx`, `create/page.tsx`, …) *and* by the client hook.
 * When a Server Component imports from a `"use client"` module, Next replaces
 * every export with a client-reference proxy — a component still renders, but a
 * plain array comes back as an opaque object, and spreading it throws
 * "CONSIGNMENT_PERMISSIONS.view is not iterable" at runtime. Constants shared
 * across the boundary belong in a module with no directive at all.
 *
 * Each capability lists several names because the backend's vocabulary for this
 * group is not settled — `/me` has been seen returning `view_consignment` and
 * `view_any_consignment` for the same capability, and the write names are not
 * confirmed. Any one grant is enough.
 *
 * That breadth is deliberate. `can()` only fails open when a user has *no*
 * permission data; once a real map arrives, matching is exact — and
 * `RequirePermission` does not hide a page, it redirects to the dashboard. So a
 * single wrong guess makes Edit look like it does nothing at all. Showing a
 * control the API then refuses is the recoverable direction, and the API is
 * what actually enforces this.
 *
 * When the real names are confirmed, cut each list to the one that is right.
 * This is the only place that needs editing.
 */
export const CONSIGNMENT_PERMISSIONS: {
  view: string[];
  create: string[];
  update: string[];
  delete: string[];
  updateStatus: string[];
  addCharges: string[];
  updateCharges: string[];
} = {
  view: ["view_consignment", "view_any_consignment"],
  create: ["create_consignment", "add_consignment"],
  update: ["update_consignment", "edit_consignment"],
  delete: ["delete_consignment", "destroy_consignment"],
  // Moving a request's status directly, outside the Locations tab.
  // The status-specific grants, plus the plain update grants: the Locations
  // tab — which also moves the status — is gated on those, and the corporate
  // role may carry only them. One grant is enough; the API decides.
  updateStatus: ["update_consignment_status", "update_tracking_status", "update_consignment", "edit_consignment"],
  addCharges: ["add_consignment_charges"],
  // Also gates deleting a charge — no separate delete grant is published.
  updateCharges: ["update_consignment_charges"],
};

/** Opening the list needs either — reading it, or being able to add to it. */
export const CONSIGNMENT_LIST_PERMISSIONS: string[] = [
  ...CONSIGNMENT_PERMISSIONS.view,
  ...CONSIGNMENT_PERMISSIONS.create,
];
