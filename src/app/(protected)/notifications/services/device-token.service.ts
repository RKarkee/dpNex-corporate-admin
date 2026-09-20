import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";

import type { DeviceToken } from "../types";

/**
 * `/corporate/device-tokens` — the devices registered to receive push.
 *
 * This portal lists and removes them. It does not register one: a web push
 * token needs a Firebase project, a service worker and a permission prompt,
 * which is its own piece of work. Removal is useful on its own — it is how
 * someone stops a phone they no longer have from receiving their notifications.
 */

const BASE = "/corporate/device-tokens";

export type DeviceTokenPlatform = "IOS" | "ANDROID" | "WEB";

export interface RegisterDeviceTokenInput {
  token: string;
  platform: DeviceTokenPlatform;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTokens(raw: unknown): DeviceToken[] {
  if (Array.isArray(raw)) return raw as DeviceToken[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.devicetokens)) return raw.devicetokens as DeviceToken[];

  const data = raw.data;
  if (Array.isArray(data)) return data as DeviceToken[];
  if (isRecord(data)) {
    if (Array.isArray(data.devicetokens)) return data.devicetokens as DeviceToken[];
    if (Array.isArray(data.data)) return data.data as DeviceToken[];
  }

  return [];
}

export async function listDeviceTokens(signal?: AbortSignal): Promise<DeviceToken[]> {
  const raw = await privateApiClient.get<unknown>(BASE, { silent: true, signal });
  return readTokens(raw);
}

/**
 * Registers the current device for push notifications.
 *
 * The backend may reassign an existing token from a previous owner, so this is
 * an upsert-style write rather than a uniqueness error.
 */
export function registerDeviceToken(
  input: RegisterDeviceTokenInput,
): Promise<MutationResult<unknown>> {
  return privateApiClient.mutate("POST", BASE, input, { silent: true });
}

/**
 * `DELETE /{token}` — the token itself is the path segment, not the row id.
 *
 * Encoded, because an FCM token is opaque and may carry characters a path
 * would otherwise swallow.
 */
export function deleteDeviceToken(token: string): Promise<MutationResult> {
  return privateApiClient.mutate(
    "DELETE",
    `${BASE}/${encodeURIComponent(token)}`,
    undefined,
    { silent: true },
  );
}
