"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  Info,
  MapPin,
  Phone,
  Plus,
  Save,
  TriangleAlert,
  User,
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";
import { resolveStateValue } from "@/shared/hooks/use-location-options";
import { cn } from "@/shared/lib/utils";

import { useSaveProfile } from "../_hooks/use-profile";
import {
  EMPTY_ADDRESS,
  EMPTY_PROFILE_FORM,
  profileSchema,
  type ProfileFormValues,
} from "../schema";
import type { ProfilePayload } from "../services/profile.service";
import type { CustomerProfile } from "../types";
import { AddressRow } from "./address-row";
import { Field, TelephonePair } from "./form-parts";

/**
 * The "Profile & Addresses" tab — Basic Information, Contact Numbers,
 * Addresses.
 *
 * Three states arrive from above and mean different things:
 *
 *   profile        the record, when one was read
 *   isCreateMode   the API said there is none — offer to create
 *   unreadable     the response could not be parsed — render everything, warn,
 *                  and do NOT offer create, since a record may well exist
 */

export function ProfileInfoTabSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((card) => (
        <Card key={card}>
          <CardHeader className="pb-4">
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Normalises a stored state to its iso2 code, but never at the cost of the
 * form.
 *
 * `resolveStateValue` fetches province data from a CDN. A failure there is
 * cosmetic — the combobox shows a code instead of a name — but an unhandled
 * rejection would abort the whole seed and leave *every* field blank, which is
 * exactly what a slow or blocked CDN would otherwise cause.
 */
async function safeResolveState(
  country: string,
  state: string | undefined,
): Promise<string> {
  const fallback = state ?? "";
  if (!country || !fallback) return fallback;

  try {
    return await resolveStateValue(country, fallback);
  } catch {
    return fallback;
  }
}

/** Section heading — icon, then title, matching every card on the page. */
function SectionTitle({
  icon: Icon,
  children,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
      <Icon className="size-5 text-primary" aria-hidden />
      {children}
      {count && count > 0 ? (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
          {count}
        </span>
      ) : null}
    </CardTitle>
  );
}

export function ProfileInfoTab({
  profile,
  isCreateMode,
  unreadable,
}: {
  profile: CustomerProfile | null;
  isCreateMode: boolean;
  unreadable: boolean;
}) {
  const saveProfile = useSaveProfile(profile?.id);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: EMPTY_PROFILE_FORM,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  /**
   * Seeds the form **once per record**, never again.
   *
   * The guard is load-bearing, not an optimisation. `useProfile` runs with
   * `staleTime: 0` and `refetchOnMount: "always"`, so the query can resolve
   * again at any point; without this, that refetch would `reset()` the form
   * out from under the user and silently throw away an address they had just
   * added or removed. Re-seeding is only ever correct before the user has
   * touched anything, and "before" is impossible to detect after the fact.
   *
   * The state values are normalised first: the wire carries a code (`"P3"`)
   * and no readable name at all, and a value that arrived as a name would stop
   * the city list loading. Resolving before `reset` means the form never
   * renders an unnormalised value.
   */
  const seededFor = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!profile) return;
    if (seededFor.current === profile.id) return;

    let cancelled = false;

    async function seed(source: CustomerProfile) {
      const addresses = await Promise.all(
        source.addresses.map(async (address) => ({
          id: address.id,
          type: address.type ?? "CURRENT",
          country: address.country,
          state: await safeResolveState(address.country, address.state),
          state_name: address.state_name ?? "",
          city: address.city,
          address_line_1: address.address_line_1,
          address_line_2: address.address_line_2 ?? "",
          zip: address.zip,
          email: address.email ?? "",
          phone_1: address.phone_1 ?? "",
          phone_2: address.phone_2 ?? "",
          telephone_1: address.telephone_1 ?? "",
          telephone_1_ext: address.telephone_1_ext ?? "",
          telephone_2: address.telephone_2 ?? "",
          telephone_2_ext: address.telephone_2_ext ?? "",
          is_primary: address.is_primary,
          // Not edited anywhere, but carried so saving cannot clear them.
          effective_from: address.effective_from ?? null,
          effective_to: address.effective_to ?? null,
          remarks: address.remarks ?? null,
        })),
      );

      if (cancelled) return;

      // Marked here, not on entry. React double-invokes effects in StrictMode:
      // the first run would set the flag, get cancelled before reaching this
      // point, and the second run would then skip seeding entirely — leaving
      // every field blank. Recording completion instead of intent makes a
      // cancelled attempt a no-op.
      seededFor.current = source.id;

      reset({
        name: source.name,
        notes: source.notes ?? "",
        phone_1: source.phone_1 ?? "",
        phone_2: source.phone_2 ?? "",
        telephone_1: source.telephone_1 ?? "",
        telephone_1_ext: source.telephone_1_ext ?? "",
        telephone_2: source.telephone_2 ?? "",
        telephone_2_ext: source.telephone_2_ext ?? "",
        addresses,
      });
    }

    void seed(profile);

    // The profile can refetch while a resolve is in flight; without this an
    // older seed could land on top of a newer one.
    return () => {
      cancelled = true;
    };
  }, [profile, reset]);

  /** Only one address may be primary, so promoting one demotes the rest. */
  function makePrimary(target: number) {
    fields.forEach((_field, index) => {
      setValue(`addresses.${index}.is_primary`, index === target ? "Y" : "N", {
        shouldDirty: true,
      });
    });
  }

  function addAddress() {
    append({ ...EMPTY_ADDRESS, is_primary: fields.length === 0 ? "Y" : "N" });
  }

  function onSubmit(values: ProfileFormValues) {
    // Not re-seeded on success. The form already holds exactly what was sent,
    // so the only thing a re-seed would add is server-side normalisation — and
    // it would do that by resetting fields under a user who may have kept
    // typing. The refetched record still updates the header and the counts.
    saveProfile.mutate(toPayload(values));
  }

  /**
   * A 422 message for one field, if the server flagged it.
   *
   * Laravel names nested errors `addresses.0.city`, which is exactly the path
   * `useFieldArray` produces — so no translation layer is needed between the
   * response and the input it belongs to.
   */
  const apiFieldError = (name: string): string | undefined =>
    isApiError(saveProfile.error)
      ? saveProfile.error.fieldError(name)
      : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {unreadable ? (
        <Notice
          tone="warning"
          icon={TriangleAlert}
          title="Some details couldn't be loaded"
          body="The service returned a response this page didn't recognise, so the form below is blank. Your saved details have not been changed or lost."
        />
      ) : null}

      {profile?.remarks ? (
        <Notice
          tone="warning"
          icon={TriangleAlert}
          title="Action needed"
          body={profile.remarks}
        />
      ) : null}

      {isCreateMode ? (
        <Notice
          tone="info"
          icon={Info}
          title="Complete your profile"
          body="You haven't set up your customer profile yet. Fill in the details below to get started."
        />
      ) : null}

      <Card>
        <CardHeader className="pb-4">
          <SectionTitle icon={User}>Basic Information</SectionTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Full Name / Company Name"
            required
            error={errors.name?.message ?? apiFieldError("name")}
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                placeholder="e.g. Acme Corporation"
                aria-describedby={describedBy}
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            )}
          </Field>

          <Field label="Notes" labelIcon={FileText} error={errors.notes?.message ?? apiFieldError("notes")}>
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                rows={3}
                placeholder="Additional notes..."
                aria-describedby={describedBy}
                {...register("notes")}
              />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <SectionTitle icon={Phone}>Contact Numbers</SectionTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Mobile 1" required error={errors.phone_1?.message ?? apiFieldError("phone_1")}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="tel"
                placeholder="+977-98XXXXXXXX"
                aria-describedby={describedBy}
                aria-invalid={Boolean(errors.phone_1)}
                {...register("phone_1")}
              />
            )}
          </Field>

          <Field label="Mobile 2" error={errors.phone_2?.message ?? apiFieldError("phone_2")}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="tel"
                placeholder="+977-98XXXXXXXX"
                aria-describedby={describedBy}
                {...register("phone_2")}
              />
            )}
          </Field>

          <TelephonePair
            label="Telephone 1"
            register={register}
            numberName="telephone_1"
            extName="telephone_1_ext"
          />

          <TelephonePair
            label="Telephone 2"
            register={register}
            numberName="telephone_2"
            extName="telephone_2_ext"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle icon={MapPin} count={fields.length}>
              Addresses
            </SectionTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAddress}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" aria-hidden />
              Add Address
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {fields.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
              <MapPin
                className="mx-auto mb-2 size-8 text-muted-foreground/50"
                aria-hidden
              />
              <p className="text-sm text-muted-foreground">
                No addresses added yet
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-primary"
                onClick={addAddress}
              >
                <Plus className="size-4" aria-hidden />
                Add your first address
              </Button>
            </div>
          ) : (
            <>
              {fields.map((field, index) => (
                <AddressRow
                  key={field.id}
                  index={index}
                  control={control}
                  register={register}
                  setValue={setValue}
                  errors={errors}
                  onRemove={() => remove(index)}
                  onMakePrimary={() => makePrimary(index)}
                  apiFieldError={apiFieldError}
                  // Read through `getValues` rather than `field.id`:
                  // `useFieldArray` puts its own generated key on `id`, which
                  // shadows the address's real numeric id in `fields`. The form
                  // value is untouched, so this is the honest source.
                  defaultExpanded={!getValues(`addresses.${index}.id`)}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAddress}
                className="w-full border-dashed text-muted-foreground hover:text-primary"
              >
                <Plus className="size-4" aria-hidden />
                Add Another Address
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* A 422 sits under its own fields. Anything else has no field to
            attach to, so it is surfaced beside the button that caused it. */}
        {isApiError(saveProfile.error) &&
        !saveProfile.error.isValidationError ? (
          <p role="alert" className="text-sm text-destructive">
            {saveProfile.error.message}
          </p>
        ) : null}

        {isApiError(saveProfile.error) && saveProfile.error.isValidationError ? (
          <p role="alert" className="text-sm text-destructive">
            Please correct the highlighted fields and try again.
          </p>
        ) : null}

        <Button
          type="submit"
          // Held back when the response was unreadable: a record may already
          // exist, and creating a second one is not recoverable from here.
          disabled={saveProfile.isPending || unreadable || (!isCreateMode && !isDirty)}
          className="min-w-40"
        >
          <Save className="size-4" aria-hidden />
          {saveProfile.isPending
            ? "Saving…"
            : isCreateMode
              ? "Create Profile"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

/** The banner shared by the create prompt, the remarks note and the warning. */
function Notice({
  tone,
  icon: Icon,
  title,
  body,
}: {
  tone: "info" | "warning";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        tone === "info"
          ? "border-primary/25 bg-primary/5"
          : "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          tone === "info" ? "text-primary" : "text-amber-600",
        )}
        aria-hidden
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/**
 * Form values → wire payload.
 *
 * Nothing sends this yet, but it is the real builder rather than a stub, so
 * wiring the endpoint is a single service call. Empty optional strings are
 * dropped: the API treats `""` as a value and would overwrite a stored one with
 * nothing. `id` survives only where it exists, which is how the backend tells
 * an updated row from a new one.
 */
function toPayload(values: ProfileFormValues): ProfilePayload {
  const trimmed = (value: string | undefined): string | undefined => {
    const next = value?.trim();
    return next ? next : undefined;
  };

  return {
    name: values.name.trim(),
    notes: trimmed(values.notes),
    phone_1: values.phone_1.trim(),
    phone_2: trimmed(values.phone_2),
    telephone_1: trimmed(values.telephone_1),
    telephone_1_ext: trimmed(values.telephone_1_ext),
    telephone_2: trimmed(values.telephone_2),
    telephone_2_ext: trimmed(values.telephone_2_ext),
    addresses: values.addresses.map((address) => ({
      ...(address.id ? { id: address.id } : {}),
      type: address.type,
      country: address.country,
      state: trimmed(address.state),
      state_name: trimmed(address.state_name),
      city: address.city.trim(),
      address_line_1: address.address_line_1.trim(),
      address_line_2: trimmed(address.address_line_2),
      zip: address.zip.trim(),
      email: trimmed(address.email),
      phone_1: trimmed(address.phone_1),
      phone_2: trimmed(address.phone_2),
      telephone_1: trimmed(address.telephone_1),
      telephone_1_ext: trimmed(address.telephone_1_ext),
      telephone_2: trimmed(address.telephone_2),
      telephone_2_ext: trimmed(address.telephone_2_ext),
      is_primary: address.is_primary,
      // Round-tripped untouched — omitting them would clear stored values.
      ...(address.effective_from ? { effective_from: address.effective_from } : {}),
      ...(address.effective_to ? { effective_to: address.effective_to } : {}),
      ...(address.remarks ? { remarks: address.remarks } : {}),
    })),
  };
}
