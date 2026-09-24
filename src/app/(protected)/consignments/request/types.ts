/**
 * The consignment-request domain, as the API models it.
 *
 * Two conventions run through this file and explain most of its shape:
 *
 * 1. **Party fields carry their own prefix.** The API sends and expects
 *    `sender_first_name` / `receiver_first_name` rather than a nested
 *    `sender: { first_name }`. The form uses the nested shape because that is
 *    what field arrays and validation want; the mappers translate.
 *
 * 2. **Reads are looser than writes.** Numbers come back as strings
 *    (`"12.50"`), booleans as padded `"Y "`, and detail responses attach
 *    related resources that the list omits. So the read types accept
 *    `string | number`, and every one that a page renders directly carries an
 *    index signature — a field the backend adds tomorrow shows up as data
 *    rather than a type error.
 */

/* -------------------------------------------------------------------------- */
/* Shared enums                                                               */
/* -------------------------------------------------------------------------- */

export const YES_NO = ["Y", "N"] as const;
export type YesNo = (typeof YES_NO)[number];

export const YES_NO_OPTIONS = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
] as const;

export const PARTY_ADDRESS_TYPES = [
  "REGISTERED",
  "PERMANENT",
  "CURRENT",
  "MAILING",
  "BILLING",
  "WORK",
  "RESIDENT",
] as const;
export type PartyAddressType = (typeof PARTY_ADDRESS_TYPES)[number];

export const PARTY_ADDRESS_TYPE_OPTIONS = PARTY_ADDRESS_TYPES.map((type) => ({
  value: type,
  label: `${type.charAt(0)}${type.slice(1).toLowerCase()}`,
}));

/** Sourced from the `consignment_urgency` meta control, not a fixed list. */
export type UrgencyLevel = string;

/* -------------------------------------------------------------------------- */
/* Check rates                                                                */
/* -------------------------------------------------------------------------- */

export interface CheckRatesPayload {
  receiver_country: string;
  receiver_state: string;
  receiver_state_name: string;
  receiver_city: string;
  receiver_zip: string;
  package_type: string;
  total_weight: number;
}

export interface SurchargeDetail {
  id: number;
  code: string;
  type: string;
}

/**
 * One quote. Passed back to the create endpoint whole, as `selected_rate` —
 * the backend re-prices against the exact object it issued, so nothing here
 * may be trimmed on its way through the confirm step.
 */
export interface RateOption {
  customer_rate_id: number;
  agent_rate_zone_id: number;
  zone_code?: string;
  zone_name?: string;
  surcharge_ids: number[];
  surcharge_details: SurchargeDetail[];
  agent_code: string;
  via_code: string;
  integrator_code: string;
  integrator_group_code?: string;
  service_code: string;
  service_desc?: string;
  currency: string;
  transit_days: number;
  eta_date: string;
  base_amount: string;
  surcharge_amount: string;
  total_amount: string;
}

export interface CheckRatesResult {
  rates: RateOption[];
}

/* -------------------------------------------------------------------------- */
/* Lookup lists                                                               */
/* -------------------------------------------------------------------------- */

export interface LookupOption {
  value: string | number;
  label: string;
}

export interface LookupListMeta {
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface LookupListResult {
  data: LookupOption[];
  meta: LookupListMeta;
}

/* -------------------------------------------------------------------------- */
/* Write payloads                                                             */
/* -------------------------------------------------------------------------- */

export interface SenderInfo {
  sender_first_name: string;
  sender_last_name: string;
  sender_company?: string;
  sender_email?: string;
  sender_country: string;
  sender_state: string;
  sender_state_name: string;
  sender_city: string;
  sender_zip: string;
  sender_address_1: string;
  sender_address_2?: string;
  sender_phone: string;
  sender_telephone?: string;
  sender_telephone_ext?: string;
  sender_is_resident: YesNo;
  sender_address_type: PartyAddressType;
}

export interface ReceiverInfo {
  receiver_first_name: string;
  receiver_last_name: string;
  receiver_company?: string;
  receiver_email?: string;
  receiver_country: string;
  receiver_state: string;
  receiver_state_name: string;
  receiver_city: string;
  receiver_zip: string;
  receiver_address_1: string;
  receiver_address_2?: string;
  receiver_phone: string;
  receiver_telephone?: string;
  receiver_telephone_ext?: string;
  receiver_is_resident: YesNo;
  receiver_address_type: PartyAddressType;
  receiver_latitude?: number;
  receiver_longitude?: number;
}

export interface BoxItemPayload {
  item_name: string;
  item_hs_code?: string;
  item_material?: string;
  item_manufacturer?: string;
  item_gender?: string;
  quantity: number;
  item_quantity_code: string;
  item_rate: number;
  item_total_amount: number;
  item_currency: string;
}

export interface BoxPayload {
  box_no: number;
  weight: number;
  volumetric_weight?: number;
  length?: number;
  width?: number;
  height?: number;
  no_of_pcs: number;
  goods_desc: string;
  hs_code?: string;
  quantity_code: string;
  declared_currency: string;
  declared_value: number;
  items: BoxItemPayload[];
}

export interface CreateConsignmentRequestPayload {
  agent_code: string;
  via_code: string;
  integrator_code: string;
  integrator_group_code: string;
  service_code: string;
  /** The quote the user picked, exactly as check-rates returned it. */
  selected_rate: RateOption;
  package_type: string;
  urgency: UrgencyLevel;

  sender: SenderInfo;
  receiver: ReceiverInfo;
  boxes: BoxPayload[];

  ship_date: string;
  need_pickup: YesNo;
  pickup_time?: string;
  preferred_delivery_time?: string;
  pickup_note?: string;
  delivery_note?: string;

  product_type?: string;
  consignment_hs_code?: string;
  consignment_goods_desc?: string;
  declared_value: number;
  declared_currency: string;

  nature_of_goods?: string;
  shipper_reference_code?: string;

  send_updates: YesNo;
  have_hscode: YesNo;
}

/**
 * The PUT body. Identical to create minus the quote — an edit does not re-run
 * check-rates, so the routing codes are carried over from the stored record
 * rather than re-derived.
 */
export type UpdateConsignmentRequestPayload = Omit<
  CreateConsignmentRequestPayload,
  "selected_rate"
>;

/* -------------------------------------------------------------------------- */
/* Read shapes                                                                */
/* -------------------------------------------------------------------------- */

/** A row in the list. Extra keys are allowed so a new column is data, not an error. */
export interface ConsignmentRequestListItem {
  id: number;
  request_tracking_id: string;
  package_type: string;
  urgency: string;
  ship_date: string;
  status: string;
  no_of_boxes: number;
  /** Present when the request was raised for someone else. */
  customer?: string | { name?: string } | null;
  customer_name?: string | null;
  /** Where the row may move next — drives the list's Update Status action. */
  next_statuses?: NextStatusOption[];
  sender?: {
    sender_company?: string | null;
    sender_city?: string | null;
    sender_country?: string | null;
    sender_state_name?: string | null;
    [key: string]: unknown;
  };
  receiver?: {
    receiver_company?: string | null;
    receiver_city?: string | null;
    receiver_country?: string | null;
    receiver_state_name?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ConsignmentBoxItemDetail {
  id?: number;
  item_name: string;
  item_hs_code?: string | null;
  item_material?: string | null;
  item_manufacturer?: string | null;
  item_gender?: string | null;
  /** Read as `item_quantity`; written as `quantity`. The mappers bridge it. */
  item_quantity: string | number;
  item_quantity_code: string;
  item_rate: string | number;
  item_total_amount: string | number;
  item_currency: string;
  [key: string]: unknown;
}

export interface ConsignmentBoxDetail {
  id?: number;
  box_no: number;
  weight: string | number;
  volumetric_weight?: string | number | null;
  /** Nested on read, flat (`length`/`width`/`height`) on write. */
  dimensions?: {
    length?: string | number | null;
    width?: string | number | null;
    height?: string | number | null;
    girth?: string | number | null;
  } | null;
  no_of_pcs: number;
  quantity_code: string;
  goods_desc: string;
  hs_code?: string | null;
  declared_value: string | number;
  declared_currency: string;
  items?: ConsignmentBoxItemDetail[];
  [key: string]: unknown;
}

/** A related resource the detail endpoint may expand — agent, via, service… */
export type RelatedResource = Record<string, unknown> | null;

/** One entry of `next_statuses` — the API supplies both code and copy. */
export interface NextStatusOption {
  value: string;
  label: string;
}

export interface ConsignmentRequestDetail {
  id: number;
  request_tracking_id: string;
  agent_code?: string | null;
  via_code?: string | null;
  integrator_code?: string | null;
  integrator_group_code?: string | null;
  service_code?: string | null;
  package_type: string;
  urgency: string;

  user?: RelatedResource;
  customer?: RelatedResource;
  corporate?: RelatedResource;
  assigned_to?: RelatedResource;
  agent?: RelatedResource;
  via?: RelatedResource;
  integrator?: RelatedResource;
  service?: RelatedResource;
  package?: RelatedResource;
  charges?: Record<string, unknown>[];
  events?: Record<string, unknown>[];

  sender: Record<string, unknown>;
  receiver: Record<string, unknown>;
  boxes?: ConsignmentBoxDetail[];
  no_of_boxes?: number | null;

  ship_date: string;
  need_pickup: string;
  pickup_time?: string | null;
  preferred_delivery_time?: string | null;
  pickup_note?: string | null;
  delivery_note?: string | null;

  product_type?: string | null;
  consignment_hs_code?: string | null;
  consignment_goods_desc?: string | null;
  declared_value: string | number;
  declared_currency: string;

  nature_of_goods?: string | null;
  shipper_reference_code?: string | null;
  status: string;
  status_label?: string | null;
  /**
   * The statuses this record may legally move to next, already labelled by the
   * API. Read by the Locations tab, whose status select must offer exactly
   * these and nothing else — a hardcoded list would drift from the workflow the
   * backend actually enforces.
   */
  next_statuses?: NextStatusOption[];
  send_updates: string;
  have_hscode: string;
  qr_data?: string | null;

  /** Who holds the current workflow task — `null` means nobody yet (Assign, not Reassign). */
  current_assignee_id?: number | null;
  current_assignment?: AssignmentHistoryEntry | null;
  assignment_histories?: AssignmentHistoryEntry[];

  /*
   * Record-level gates: whether *this* request, in its current state, accepts
   * the action. Paired with the user's own permission wherever both exist.
   */
  can_update_sender?: boolean;
  can_update_receiver?: boolean;
  can_update_tracking_status?: boolean;
  can_add_charges?: boolean;
  can_update_charges?: boolean;
  [key: string]: unknown;
}

export interface ConsignmentDetailResult {
  request: ConsignmentRequestDetail;
  boxes: ConsignmentBoxDetail[];
}

/* -------------------------------------------------------------------------- */
/* Box and item sub-resource payloads                                         */
/* -------------------------------------------------------------------------- */

/** Every field optional — the dialog sends only what it collected. */
export interface BoxWritePayload {
  box_no?: number;
  weight?: number;
  volumetric_weight?: number;
  length?: number;
  width?: number;
  height?: number;
  no_of_pcs?: number;
  goods_desc?: string;
  hs_code?: string;
  quantity_code?: string;
  declared_currency?: string;
  declared_value?: number;
  items?: ItemWritePayload[];
}

export interface ItemWritePayload {
  item_name: string;
  item_hs_code?: string;
  item_material?: string;
  item_manufacturer?: string;
  item_gender?: string;
  quantity?: number;
  item_quantity_code?: string;
  item_rate?: number;
  item_total_amount?: number;
  item_currency?: string;
}

/* -------------------------------------------------------------------------- */
/* Workflow actions                                                           */
/* -------------------------------------------------------------------------- */

/** A user as the workflow endpoints embed one — `name` is often null. */
export interface WorkflowPerson {
  id?: number;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  [key: string]: unknown;
}

/** One entry of `assignment_histories` (and the shape of `current_assignment`). */
export interface AssignmentHistoryEntry {
  id: number;
  workflow_task_code?: string | null;
  workflow_task_name?: string | null;
  assigned_to?: WorkflowPerson | null;
  assigned_by?: WorkflowPerson | null;
  assigned_at?: string | null;
  assigned_role?: string | null;
  seen_at?: string | null;
  completed_at?: string | null;
  remarks?: string | null;
  /** Human-readable, e.g. "2 weeks 4 days 11 hours" — null until that stage happens. */
  ack_duration?: string | null;
  response_duration?: string | null;
  active_work_duration?: string | null;
  ownership_duration?: string | null;
  [key: string]: unknown;
}

/** One entry of `events` — the activity log. */
export interface ConsignmentEventEntry {
  id: number;
  task_code?: string | null;
  event?: string | null;
  event_code?: string | null;
  performed_by?: WorkflowPerson | null;
  performed_at?: string | null;
  remarks?: string | null;
  [key: string]: unknown;
}

/** `POST …/updatestatus`. Place fields only with `have_new_location: "Y"`. */
export interface UpdateStatusPayload {
  status: string;
  have_new_location: YesNo;
  comments?: string;
  location?: string;
  country?: string;
  /** The readable state name, not the picker's iso2 code. */
  state?: string;
  city?: string;
  location_date?: string;
  arrived_at?: string;
  moved_at?: string;
  /** Only for `FORWARDED_WITH`, and then always with `new_tracking_no`. */
  forwarder_code?: string;
  new_tracking_no?: string;
  // Documented but deliberately not collected yet — uncomment together with
  // the matching fields in update-status-dialog.tsx.
  // type?: "CONSIGNMENT" | "REQUEST";
  // tracking_no?: string;
}

/** `POST …/events`. */
export interface CreateEventPayload {
  event_code: string;
}

/** `POST …/assign` — for a request nobody holds yet. */
export interface AssignPayload {
  task_code: string;
  assigned_to: number;
}

/** `POST …/reassign` — for a request someone already holds. */
export interface ReassignPayload {
  assigned_to: number;
  reason: string;
}

/**
 * `POST …/cancel`. The reason is recorded against the record and shown in its
 * history — 3 to 500 characters.
 */
export interface CancelPayload {
  reason: string;
}
