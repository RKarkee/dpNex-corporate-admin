"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/shared/components/toast";

import {
  deleteDeviceToken,
  listDeviceTokens,
  registerDeviceToken,
  type RegisterDeviceTokenInput,
} from "../services/device-token.service";
import { notificationKeys } from "./query-keys";

/** The devices registered to receive push for this account. */
export function useDeviceTokens() {
  return useQuery({
    queryKey: notificationKeys.devices(),
    queryFn: ({ signal }) => listDeviceTokens(signal),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Removes a device.
 *
 * Not optimistic: this is how someone stops a phone they no longer have from
 * receiving their notifications, and a row that vanishes and silently comes
 * back would leave them believing it worked. The refetch is the confirmation.
 */
export function useDeleteDeviceToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => deleteDeviceToken(token),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Device removed");
      await queryClient.invalidateQueries({ queryKey: notificationKeys.devices() });
    },

    onError: (error) => toast.error(error),
  });
}

/**
 * Registers the current device token and then refreshes the device list.
 */
export function useRegisterDeviceToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterDeviceTokenInput) => registerDeviceToken(input),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Device registered");
      await queryClient.invalidateQueries({ queryKey: notificationKeys.devices() });
    },

    onError: (error) => toast.error(error),
  });
}
