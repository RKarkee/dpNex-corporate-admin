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

/**
 * A party's address type (REGISTERED, RESIDENT, …). The vocabulary is the
 * `customer_address_type` meta control's, not a list kept here — so a type the
 * API adds is usable without a deploy. Replaces the old Y/N `is_resident`.
 */
export type PartyAddressType = string;

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
  /** From `/meta` `rate_check_item_types`; only sent once the user picks one. */
  item_type?: string;
  /** Optional delivery address lines — only sent when filled in. */
  receiver_address_1?: string;
  receiver_address_2?: string;
  /** Every box being priced; `total_weight` is their summed weight. */
  boxes: QuotedBox[];
}

/**
 * One box as priced on the rate-check step. Carried to the confirm step so the
 * form starts with the boxes the chosen quote was calculated for.
 */
export interface QuotedBox {
  weight: number;
  length: number;
  width: number;
  height: number;
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

  /*
   * Labels. `is_label_generated` picks the action bar's buttons (Generate vs
   * Download + Regenerate); `current_label` and `label_options` are the
   * detail's own copies, used until the label queries answer.
   */
  is_label_generated?: boolean;
  current_label?: LabelHistoryItem | null;
  label_options?: LabelOption[];
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

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One label the request can produce, from `GET …/label/options`.
 *
 * A request has not been handed to a carrier yet, so in practice this is only
 * ever our own `INTERNAL` label; `INTEGRATOR_API` is typed because the endpoint
 * is shared with consignments, which can offer carrier labels.
 */
export interface LabelOption {
  type: "INTERNAL" | "INTEGRATOR_API" | (string & {});
  label: string;
  button_label?: string | null;
  label_api_id?: number | null;
  via_code?: string | null;
  integrator_code?: string | null;
  /** True when the option needs `additional_fields` filled first — no form for those yet. */
  requires_additional_data?: boolean;
  additional_fields?: unknown[];
}

/** One version from `GET …/label/history` (and the shape of `current_label`). */
export interface LabelHistoryItem {
  id: number;
  version: number;
  is_current: boolean;
  /** False when the attempt failed — no file exists for it. */
  generated: boolean;
  status: string;
  is_cancellable?: boolean;
  provider?: string | null;
  forwarder_code?: string | null;
  shipment_type?: string | null;
  via_code?: string | null;
  integrator_code?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  /** Bytes. */
  file_size?: number | null;
  attempts?: number | null;
  failure_reason?: string | null;
  generated_at?: string | null;
  /** Absolute URL — not fetchable without the bearer token; use `/labels/{id}/download`. */
  download_url?: string | null;
  created_at?: string | null;
}

/**
 * Body for `POST …/label/regenerate`. Everything printed on the label is read
 * from the record server-side; this only says which label and that a fresh
 * version is wanted even though a usable one exists.
 */
export interface RegenerateLabelPayload {
  label_type?: "INTERNAL" | "INTEGRATOR_API";
  label_api_id?: number;
  additional_data?: Record<string, unknown>;
  regenerate?: boolean;
}


/* -------------------------------------------------------------------------- */
/* Remote address + weight/dimension checks                                   */
/* -------------------------------------------------------------------------- */

/**
 * The routing a consignment is priced against. It is not a form field: create
 * takes it from the chosen quote, edit from the stored record. Both checks
 * below need it.
 */
export interface ShipmentRouting {
  viaCode: string;
  integratorCode: string;
  packageType: string;
}

/** `POST /corporate/consignments/check-remote-address`. */
export interface CheckRemoteAddressPayload {
  receiver_country: string;
  receiver_state: string;
  receiver_city: string;
  receiver_zip: string;
  via_code: string;
  integrator_code: string;
  address_type: "receiver";
}

/** `data.remote_check` of that response. */
export interface RemoteAddressCheckResult {
  address_type: string;
  is_remote: boolean;
  matched_rule_id: number | null;
  match_scope: string | null;
  applies_to: string | null;
  remote_charge_adjustment: number | string | null;
  fuel_charge_adjustment: number | string | null;
  total_extra_charge: number | string | null;
  display_message: string | null;
  customer_message: string | null;
  origin_surcharge: string | null;
  destination_surcharge: string | null;
  priority: number | null;
}

/** `POST /corporate/consignments/calculate-weight-dimension` — one box. */
export interface CalculateWeightDimensionPayload {
  box_no: number;
  via_code: string;
  integrator_code: string;
  package_type: string;
  receiver_country: string;
  receiver_state: string;
  receiver_city: string;
  receiver_zip: string;
  weight: number;
  length: number;
  width: number;
  height: number;
}

/** One row of that response's `data` array — matched back by `box_no`. */
export interface WeightDimensionCheckResult {
  box_no: number;
  weights: {
    actual_weight: number | string;
    volumetric_weight: number | string;
    valid_weight: number | string;
    /** Current key. */
    quantity_code?: string;
    /** Older name for `quantity_code`. */
    unit?: string;
    divisor: number | string;
  };
  oversize_exception: string | null;
  overweight_exception: string | null;
  exception_types: string[];
}
