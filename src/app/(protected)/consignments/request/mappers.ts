import { resolveLookupLabel } from "@/shared/api/services/lookup.service";

import { newBoxDefaults, type ConsignmentFormValues } from "./schema";
import type {
  BoxPayload,
  ConsignmentBoxDetail,
  ConsignmentRequestDetail,
  CreateConsignmentRequestPayload,
  PartyAddressType,
  RateOption,
  ReceiverInfo,
  SenderInfo,
  UpdateConsignmentRequestPayload,
  YesNo,
} from "./types";

/**
 * The seam between the form's shape and the API's.
 *
 * Three translations happen here, in both directions:
 *
 *   nested → prefixed   `sender.first_name`  ↔  `sender_first_name`
 *   flat   → nested     `length`/`width`     ↔  `dimensions: { … }`
 *   renamed             `quantity`           ↔  `item_quantity`
 *
 * Keeping them in one file means the form never has to know the wire format,
 * and a field added to the API is one edit rather than five.
 */

/* -------------------------------------------------------------------------- */
/* Coercion helpers                                                           */
/* -------------------------------------------------------------------------- */

function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** The API sometimes returns `"Y "` with trailing space; trim before comparing. */
function toYesNo(value: unknown, fallback: YesNo): YesNo {
  const trimmed = typeof value === "string" ? value.trim() : value;
  return trimmed === "Y" || trimmed === "N" ? trimmed : fallback;
}

/** `"2026-08-06 16:41:00"` → `"2026-08-06T16:41"`, what a datetime input wants. */
function toDateTimeLocal(value: unknown): string {
  if (!value) return "";
  return String(value).replace(" ", "T").slice(0, 16);
}

/** Empty strings become `undefined`, so optional keys are omitted, not blanked. */
function optional(value: string | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* Form → payload                                                             */
/* -------------------------------------------------------------------------- */

function toSenderInfo(sender: ConsignmentFormValues["sender"]): SenderInfo {
  return {
    sender_first_name: sender.first_name,
    sender_last_name: sender.last_name,
    sender_company: optional(sender.company),
    sender_email: optional(sender.email),
    sender_country: sender.country,
    sender_state: sender.state,
    sender_state_name: sender.state_name ?? "",
    sender_city: sender.city,
    sender_zip: sender.zip,
    sender_address_1: sender.address_1,
    sender_address_2: optional(sender.address_2),
    sender_phone: sender.phone,
    sender_telephone: optional(sender.telephone),
    sender_telephone_ext: optional(sender.telephone_ext),
    sender_is_resident: sender.is_resident,
    sender_address_type: sender.address_type,
  };
}

function toReceiverInfo(
  receiver: ConsignmentFormValues["receiver"],
): ReceiverInfo {
  return {
    receiver_first_name: receiver.first_name,
    receiver_last_name: receiver.last_name,
    receiver_company: optional(receiver.company),
    receiver_email: optional(receiver.email),
    receiver_country: receiver.country,
    receiver_state: receiver.state,
    receiver_state_name: receiver.state_name ?? "",
    receiver_city: receiver.city,
    receiver_zip: receiver.zip,
    receiver_address_1: receiver.address_1,
    receiver_address_2: optional(receiver.address_2),
    receiver_phone: receiver.phone,
    receiver_telephone: optional(receiver.telephone),
    receiver_telephone_ext: optional(receiver.telephone_ext),
    receiver_is_resident: receiver.is_resident,
    receiver_address_type: receiver.address_type,
    receiver_latitude: receiver.latitude,
    receiver_longitude: receiver.longitude,
  };
}

/** Drops every `*_label` — those exist only so the comboboxes can render. */
function toBoxPayloads(boxes: ConsignmentFormValues["boxes"]): BoxPayload[] {
  return boxes.map((box) => ({
    box_no: box.box_no,
    weight: box.weight,
    volumetric_weight: box.volumetric_weight,
    length: box.length,
    width: box.width,
    height: box.height,
    no_of_pcs: box.no_of_pcs,
    goods_desc: box.goods_desc,
    hs_code: optional(box.hs_code),
    quantity_code: box.quantity_code,
    declared_currency: box.declared_currency,
    declared_value: box.declared_value,
    items: box.items.map((item) => ({
      item_name: item.item_name,
      item_hs_code: optional(item.item_hs_code),
      item_material: optional(item.item_material),
      item_manufacturer: optional(item.item_manufacturer),
      item_gender: optional(item.item_gender),
      // Read as `item_quantity`, written as `quantity`.
      quantity: item.quantity,
      item_quantity_code: item.item_quantity_code,
      item_rate: item.item_rate,
      item_total_amount: item.item_total_amount,
      item_currency: item.item_currency,
    })),
  }));
}

/** The parts of the body that create and update word identically. */
function toSharedPayload(data: ConsignmentFormValues) {
  return {
    urgency: data.urgency,
    sender: toSenderInfo(data.sender),
    receiver: toReceiverInfo(data.receiver),
    boxes: toBoxPayloads(data.boxes),

    ship_date: data.ship_date,
    need_pickup: data.need_pickup,
    pickup_time: optional(data.pickup_time),
    preferred_delivery_time: optional(data.preferred_delivery_time),
    pickup_note: optional(data.pickup_note),
    delivery_note: optional(data.delivery_note),

    product_type: optional(data.product_type),
    consignment_hs_code: optional(data.consignment_hs_code),
    consignment_goods_desc: optional(data.consignment_goods_desc),
    declared_value: data.declared_value,
    declared_currency: data.declared_currency,

    nature_of_goods: optional(data.nature_of_goods),
    shipper_reference_code: optional(data.shipper_reference_code),

    send_updates: data.send_updates,
    have_hscode: data.have_hscode,
  };
}

/**
 * The create body.
 *
 * The routing codes are copied off the chosen quote rather than collected from
 * the user — they identify the exact lane that was priced. `selected_rate`
 * carries the whole quote so the backend can verify the price against what it
 * issued.
 */
export function buildCreatePayload(
  rate: RateOption,
  packageType: string,
  data: ConsignmentFormValues,
): CreateConsignmentRequestPayload {
  return {
    agent_code: rate.agent_code,
    via_code: rate.via_code,
    integrator_code: rate.integrator_code,
    integrator_group_code: rate.integrator_group_code ?? "",
    service_code: rate.service_code,
    selected_rate: rate,
    package_type: packageType,
    ...toSharedPayload(data),
  };
}

/**
 * The update body.
 *
 * Routing and package come from the stored record: an edit does not re-run
 * check-rates, so re-deriving them is not possible, and re-sending the
 * original values keeps the request on the lane it was priced for.
 */
export function buildUpdatePayload(
  data: ConsignmentFormValues,
  detail: ConsignmentRequestDetail,
): UpdateConsignmentRequestPayload {
  return {
    agent_code: str(detail.agent_code),
    via_code: str(detail.via_code),
    integrator_code: str(detail.integrator_code),
    integrator_group_code: str(detail.integrator_group_code),
    service_code: str(detail.service_code),
    package_type: detail.package_type,
    ...toSharedPayload(data),
  };
}

/* -------------------------------------------------------------------------- */
/* Detail → form                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Seeds the form from a stored record.
 *
 * Note what happens to the `*_label` fields: they are seeded with the stored
 * *code*, so the comboboxes show something readable-ish immediately rather
 * than an empty trigger. `resolveLookupLabels` upgrades them to real names
 * once the lookup lists answer.
 */
export function mapDetailToFormValues(
  request: ConsignmentRequestDetail,
  boxes: ConsignmentBoxDetail[],
): ConsignmentFormValues {
  const sender = isRecord(request.sender) ? request.sender : {};
  const receiver = isRecord(request.receiver) ? request.receiver : {};

  const mappedBoxes = (boxes ?? []).map((box, index) => ({
    box_no: toNumber(box.box_no, index + 1),
    weight: toNumber(box.weight),
    volumetric_weight: toOptionalNumber(box.volumetric_weight),
    // Nested on the way in, flat on the way out.
    length: toOptionalNumber(box.dimensions?.length),
    width: toOptionalNumber(box.dimensions?.width),
    height: toOptionalNumber(box.dimensions?.height),
    no_of_pcs: toNumber(box.no_of_pcs, 1),
    goods_desc: str(box.goods_desc),
    hs_code: str(box.hs_code),
    hs_code_label: str(box.hs_code),
    quantity_code: str(box.quantity_code) || newBoxDefaults.quantity_code,
    declared_currency:
      str(box.declared_currency) || newBoxDefaults.declared_currency,
    declared_currency_label:
      str(box.declared_currency) || newBoxDefaults.declared_currency,
    declared_value: toNumber(box.declared_value),
    items: (box.items ?? []).map((item) => ({
      item_name: str(item.item_name),
      item_hs_code: str(item.item_hs_code),
      item_hs_code_label: str(item.item_hs_code),
      item_material: str(item.item_material),
      item_material_label: str(item.item_material),
      item_manufacturer: str(item.item_manufacturer),
      item_manufacturer_label: str(item.item_manufacturer),
      item_gender: str(item.item_gender),
      quantity: toNumber(item.item_quantity, 1),
      item_quantity_code:
        str(item.item_quantity_code) || newBoxDefaults.quantity_code,
      item_rate: toNumber(item.item_rate),
      item_total_amount: toNumber(item.item_total_amount),
      item_currency: str(item.item_currency) || newBoxDefaults.declared_currency,
      item_currency_label:
        str(item.item_currency) || newBoxDefaults.declared_currency,
    })),
  }));

  return {
    urgency: str(request.urgency),

    sender: {
      first_name: str(sender.sender_first_name),
      last_name: str(sender.sender_last_name),
      company: str(sender.sender_company),
      email: str(sender.sender_email),
      country: str(sender.sender_country),
      state: str(sender.sender_state),
      state_name: str(sender.sender_state_name),
      city: str(sender.sender_city),
      zip: str(sender.sender_zip),
      address_1: str(sender.sender_address_1),
      address_2: str(sender.sender_address_2),
      phone: str(sender.sender_phone),
      telephone: str(sender.sender_telephone),
      telephone_ext: str(sender.sender_telephone_ext),
      is_resident: toYesNo(sender.sender_is_resident, "Y"),
      address_type: (str(sender.sender_address_type) ||
        "RESIDENT") as PartyAddressType,
    },

    receiver: {
      first_name: str(receiver.receiver_first_name),
      last_name: str(receiver.receiver_last_name),
      company: str(receiver.receiver_company),
      email: str(receiver.receiver_email),
      country: str(receiver.receiver_country),
      state: str(receiver.receiver_state),
      state_name: str(receiver.receiver_state_name),
      city: str(receiver.receiver_city),
      zip: str(receiver.receiver_zip),
      address_1: str(receiver.receiver_address_1),
      address_2: str(receiver.receiver_address_2),
      phone: str(receiver.receiver_phone),
      telephone: str(receiver.receiver_telephone),
      telephone_ext: str(receiver.receiver_telephone_ext),
      is_resident: toYesNo(receiver.receiver_is_resident, "Y"),
      address_type: (str(receiver.receiver_address_type) ||
        "RESIDENT") as PartyAddressType,
      latitude: toOptionalNumber(receiver.receiver_latitude),
      longitude: toOptionalNumber(receiver.receiver_longitude),
    },

    // A request with no boxes is not valid, but it is loadable — start the
    // user with an empty one rather than an unrenderable form.
    boxes: mappedBoxes.length > 0 ? mappedBoxes : [{ ...newBoxDefaults }],

    ship_date: str(request.ship_date),
    need_pickup: toYesNo(request.need_pickup, "N"),
    pickup_time: toDateTimeLocal(request.pickup_time),
    preferred_delivery_time: toDateTimeLocal(request.preferred_delivery_time),
    pickup_note: str(request.pickup_note),
    delivery_note: str(request.delivery_note),

    product_type: str(request.product_type),
    product_type_label: str(request.product_type),

    have_hscode: toYesNo(request.have_hscode, "N"),
    consignment_hs_code: str(request.consignment_hs_code),
    consignment_hs_code_label: str(request.consignment_hs_code),

    consignment_goods_desc: str(request.consignment_goods_desc),
    declared_value: toNumber(request.declared_value),
    declared_currency: str(request.declared_currency),
    declared_currency_label: str(request.declared_currency),

    nature_of_goods: str(request.nature_of_goods),
    shipper_reference_code: str(request.shipper_reference_code),

    send_updates: toYesNo(request.send_updates, "Y"),
  };
}

/* -------------------------------------------------------------------------- */
/* Lookup label resolution                                                    */
/* -------------------------------------------------------------------------- */

/**
 * How long the edit form waits for prettier labels before opening anyway.
 *
 * Every field already holds its code as a stand-in, so the deadline is the
 * difference between "8517.12" and "Mobile phones" — never between a usable
 * form and an empty one. Blocking on a slow lookup endpoint would leave someone
 * staring at a skeleton for the full request timeout when the record itself
 * arrived long ago.
 */
const LABEL_RESOLVE_TIMEOUT_MS = 4_000;

/**
 * Fills in the display labels for every async-lookup field on a seeded form.
 *
 * Run after `mapDetailToFormValues` and before the values reach the form. All
 * requests go out together, and the batch is capped by a deadline — after which
 * whatever resolved is kept and the rest stay as codes.
 *
 * The per-code work lives in `resolveLookupLabel`, which memoises by
 * `(kind, code)` process-wide. So a currency repeated across thirty items costs
 * one request, and the box/item dialogs that resolve the same codes later pay
 * nothing.
 *
 * Mutates and returns the object it was given; it is a fresh mapper output, not
 * shared state.
 */
export async function resolveLookupLabels(
  data: ConsignmentFormValues,
): Promise<ConsignmentFormValues> {
  const pending: Promise<void>[] = [
    resolveLookupLabel("hsCode", data.consignment_hs_code).then((label) => {
      if (label) data.consignment_hs_code_label = label;
    }),
    resolveLookupLabel("currency", data.declared_currency).then((label) => {
      if (label) data.declared_currency_label = label;
    }),
  ];

  for (const box of data.boxes) {
    pending.push(
      resolveLookupLabel("hsCode", box.hs_code).then((label) => {
        if (label) box.hs_code_label = label;
      }),
      resolveLookupLabel("currency", box.declared_currency).then((label) => {
        if (label) box.declared_currency_label = label;
      }),
    );

    for (const item of box.items) {
      pending.push(
        resolveLookupLabel("hsCode", item.item_hs_code).then((label) => {
          if (label) item.item_hs_code_label = label;
        }),
        resolveLookupLabel("material", item.item_material).then((label) => {
          if (label) item.item_material_label = label;
        }),
        resolveLookupLabel("manufacturer", item.item_manufacturer).then(
          (label) => {
            if (label) item.item_manufacturer_label = label;
          },
        ),
        resolveLookupLabel("currency", item.item_currency).then((label) => {
          if (label) item.item_currency_label = label;
        }),
      );
    }
  }

  // `race`, not `all`: the deadline wins if the lookups are slow, and the form
  // opens with codes where names have not arrived yet.
  await Promise.race([
    Promise.all(pending),
    new Promise((resolve) => setTimeout(resolve, LABEL_RESOLVE_TIMEOUT_MS)),
  ]);

  return data;
}
