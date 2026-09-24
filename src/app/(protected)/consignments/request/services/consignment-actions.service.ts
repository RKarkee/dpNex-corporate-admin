import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";

import { requiresForwarder } from "../[id]/(detail)/locations/types";
import type {
  AssignPayload,
  CancelPayload,
  CreateEventPayload,
  ReassignPayload,
  ReceiverInfo,
  SenderInfo,
  UpdateStatusPayload,
} from "../types";
import { ENDPOINTS } from "./consignment-request.service";

/**
 * The workflow actions on one consignment request — status, the two parties,
 * events and assignment.
 *
 * Each is a single POST against its own sub-route rather than a field on the
 * general PATCH, because each is its own permissioned, audited step on the
 * backend. All are `silent`: the dialogs place a 422 on the field it names and
 * toast whatever they cannot place, so the client's own toast would double up.
 */

/**
 * Drops blank optional strings, so Laravel never stores `""` over a value and
 * a half-filled optional field is not sent at all.
 */
function compact<T extends object>(payload: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = typeof value === "string" ? value.trim() : value;
  }
  return out as T;
}

/**
 * `POST …/updatestatus`.
 *
 * Same two rules the Locations tab mirrors: place fields travel only with
 * `have_new_location: "Y"`, and the forwarder pair only for `FORWARDED_WITH`
 * — so the request never carries a field the server would reject or ignore.
 */
export function toStatusPayload(input: UpdateStatusPayload): UpdateStatusPayload {
  const payload: UpdateStatusPayload = {
    status: input.status,
    have_new_location: input.have_new_location,
    comments: input.comments,
  };

  if (input.have_new_location === "Y") {
    payload.location = input.location;
    payload.country = input.country;
    payload.state = input.state;
    payload.city = input.city;
    payload.location_date = input.location_date;
    payload.arrived_at = input.arrived_at;
    payload.moved_at = input.moved_at;
  }

  if (requiresForwarder(input.status)) {
    payload.forwarder_code = input.forwarder_code;
    payload.new_tracking_no = input.new_tracking_no;
  }

  return compact(payload);
}

export function updateRequestStatus(
  id: number,
  input: UpdateStatusPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "POST",
    ENDPOINTS.updateStatus(id),
    toStatusPayload(input),
    { silent: true },
  );
}

/**
 * `POST …/updateSender` — the flat, prefixed party shape. The resolved state
 * name travels under both `sender_state` and `sender_state_name`, whichever
 * one the API reads.
 */
export function updateRequestSender(
  id: number,
  sender: SenderInfo,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "POST",
    ENDPOINTS.updateSender(id),
    compact(sender),
    { silent: true },
  );
}

/** `POST …/updateReceiver` — as `updateRequestSender`, plus coordinates. */
export function updateRequestReceiver(
  id: number,
  receiver: ReceiverInfo,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "POST",
    ENDPOINTS.updateReceiver(id),
    compact(receiver),
    { silent: true },
  );
}

/** `POST …/events` — logs one event from `/meta`'s event-code list. */
export function createRequestEvent(
  id: number,
  payload: CreateEventPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.events(id), payload, {
    silent: true,
  });
}

/** `POST …/assign` — hands a task on an unassigned request to a user. */
export function assignRequest(
  id: number,
  payload: AssignPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.assign(id), payload, {
    silent: true,
  });
}

/** `POST …/reassign` — moves an assigned request to someone else, with a reason. */
export function reassignRequest(
  id: number,
  payload: ReassignPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "POST",
    ENDPOINTS.reassign(id),
    compact(payload),
    { silent: true },
  );
}

/** `POST …/cancel` — cancels the request, with the reason kept in its history. */
export function cancelRequest(id: number, payload: CancelPayload): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.cancel(id), compact(payload), {
    silent: true,
  });
}
