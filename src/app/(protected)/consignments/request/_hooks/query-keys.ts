/**
 * Every cache key in this feature, in one place.
 *
 * They nest so that invalidating a prefix invalidates everything beneath it,
 * and the nesting order is the point:
 *
 *   ["consignment-requests"]                          → the whole feature
 *   ["consignment-requests", "list", { page, … }]     → one page of the table
 *   ["consignment-requests", "deleted", { page, … }]  → one page of the Deleted tab
 *   ["consignment-requests", id]                      → everything about one request
 *   ["consignment-requests", id, "detail"]            → the record
 *   ["consignment-requests", id, "boxes"]             → its boxes
 *   ["consignment-requests", id, "boxes", boxId, "items"]
 *
 * The id sits *before* the sub-resource, not after. With `["…", "detail", id]`
 * and `["…", id, "boxes"]` the two branches never overlap, so adding a box
 * would refresh the box table and leave the record's own `no_of_boxes` — which
 * the detail header renders — reporting the old count.
 *
 * Written as functions rather than inline arrays because that mistake is
 * invisible at the call site and obvious here.
 */

export const consignmentRequestKeys = {
  all: ["consignment-requests"] as const,

  lists: () => [...consignmentRequestKeys.all, "list"] as const,
  list: (params: { page: number; perPage: number; search: string }) =>
    [...consignmentRequestKeys.lists(), params] as const,

  /** The landing page's Deleted tab — under `all`, so a restore refreshes both lists. */
  deleted: (params: { page: number; perPage: number }) =>
    [...consignmentRequestKeys.all, "deleted", params] as const,

  /** Everything under one request — the widest thing any write here touches. */
  request: (id: number | string) => [...consignmentRequestKeys.all, id] as const,

  detail: (id: number | string) =>
    [...consignmentRequestKeys.request(id), "detail"] as const,

  /** The mapped, label-resolved values the edit form is seeded with. */
  formValues: (id: number | string) =>
    [...consignmentRequestKeys.request(id), "form-values"] as const,

  boxes: (id: number | string) =>
    [...consignmentRequestKeys.request(id), "boxes"] as const,

  box: (id: number | string, boxId: number | string) =>
    [...consignmentRequestKeys.boxes(id), boxId] as const,

  items: (id: number | string, boxId: number | string) =>
    [...consignmentRequestKeys.box(id, boxId), "items"] as const,

  item: (id: number | string, boxId: number | string, itemId: number | string) =>
    [...consignmentRequestKeys.items(id, boxId), itemId] as const,
} as const;
