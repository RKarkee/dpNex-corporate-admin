/**
 * Every cache key in the Consignment Admin module, in one place.
 *
 * They nest so that invalidating a prefix invalidates everything beneath it,
 * and the nesting order is the point:
 *
 *   ["corporate-consignments"]                      → the whole feature
 *   ["corporate-consignments", "list", { page, … }] → one page of the table
 *   ["corporate-consignments", "deleted", { page, … }] → one page of the Deleted tab
 *   ["corporate-consignments", id]                  → everything about one record
 *   ["corporate-consignments", id, "detail"]        → the record
 *   ["corporate-consignments", id, "boxes"]         → its boxes
 *   ["corporate-consignments", id, "boxes", boxId, "items"]
 *
 * The id sits *before* the sub-resource, not after. With `["…", "detail", id]`
 * and `["…", id, "boxes"]` the two branches never overlap, so adding a box
 * would refresh the box table and leave the record's own `no_of_boxes` — which
 * the detail header renders — reporting the old count.
 *
 * The root differs from the Consignment Request module's `["consignment-requests"]`
 * on purpose: these are separate resources, and a shared prefix would make one
 * module's writes silently refetch the other's lists.
 */

export const consignmentAdminKeys = {
  all: ["corporate-consignments"] as const,

  lists: () => [...consignmentAdminKeys.all, "list"] as const,
  list: (params: { page: number; perPage: number; search: string }) =>
    [...consignmentAdminKeys.lists(), params] as const,

  /** The landing page's Deleted tab — under `all`, so a restore refreshes both lists. */
  deleted: (params: { page: number; perPage: number }) =>
    [...consignmentAdminKeys.all, "deleted", params] as const,

  /** Everything under one consignment — the widest thing any write here touches. */
  record: (id: number | string) => [...consignmentAdminKeys.all, id] as const,

  detail: (id: number | string) =>
    [...consignmentAdminKeys.record(id), "detail"] as const,

  /** The mapped, label-resolved values the edit form is seeded with. */
  formValues: (id: number | string) =>
    [...consignmentAdminKeys.record(id), "form-values"] as const,

  boxes: (id: number | string) =>
    [...consignmentAdminKeys.record(id), "boxes"] as const,

  box: (id: number | string, boxId: number | string) =>
    [...consignmentAdminKeys.boxes(id), boxId] as const,

  items: (id: number | string, boxId: number | string) =>
    [...consignmentAdminKeys.box(id, boxId), "items"] as const,

  item: (id: number | string, boxId: number | string, itemId: number | string) =>
    [...consignmentAdminKeys.items(id, boxId), itemId] as const,
} as const;
