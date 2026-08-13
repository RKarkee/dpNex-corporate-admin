"use client";

import { Controller } from "react-hook-form";
import { Truck } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Card } from "@/shared/components/ui/card";
import { Combobox } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { YES_NO_OPTIONS } from "../types";
import { FieldGroup, FieldShell } from "./field-shell";
import type {
  AdminControl,
  AdminErrors,
  AdminRegister,
  AdminSetValue,
  AdminWatch,
} from "./form-types";
import { currencyFetcher, hsCodeFetcher } from "./lookup-fetchers";

/**
 * Everything about the shipment that is not a party or a box.
 *
 * Two fields reveal others — pickup time and note appear only once a pickup is
 * asked for, and the HS code only once the user says they have one. Rendering
 * them disabled instead would leave the user reading fields that cannot apply.
 *
 * Nature of goods and the goods description are required here, unlike on a
 * consignment request: this resource is what customs paperwork is generated
 * from.
 */

export interface ShipmentDetailsFieldsProps {
  control: AdminControl;
  register: AdminRegister;
  errors: AdminErrors;
  watch: AdminWatch;
  setValue: AdminSetValue;
}

export function ShipmentDetailsFields({
  control,
  register,
  errors,
  watch,
  setValue,
}: ShipmentDetailsFieldsProps) {
  const needPickup = watch("need_pickup");
  const haveHsCode = watch("have_hscode");
  const hsCodeLabel = watch("consignment_hs_code_label");
  const currencyLabel = watch("declared_currency_label");

  const { urgencyOptions, productTypeOptions } = useMetaOptions();

  return (
    <Card className="p-6 sm:p-8">
      <FieldGroup
        title="Shipment details"
        description="How and when this consignment should move."
        icon={Truck}
      >
        <FieldShell label="Urgency" required error={errors.urgency?.message}>
          {() => (
            <Controller
              control={control}
              name="urgency"
              render={({ field }) => (
                <Combobox
                  options={urgencyOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select urgency"
                  searchPlaceholder="Search urgency…"
                  allowCustomValue={false}
                  aria-invalid={Boolean(errors.urgency)}
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell label="Ship date" required error={errors.ship_date?.message}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="date"
              aria-describedby={describedBy}
              aria-invalid={errors.ship_date ? true : undefined}
              {...register("ship_date")}
            />
          )}
        </FieldShell>

        <FieldShell label="Pickup required" required>
          {({ id }) => (
            <Controller
              control={control}
              name="need_pickup"
              render={({ field }) => (
                <NativeSelect
                  id={id}
                  options={YES_NO_OPTIONS}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </FieldShell>

        {needPickup === "Y" ? (
          <>
            <FieldShell
              label="Pickup time"
              required
              error={errors.pickup_time?.message}
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="datetime-local"
                  aria-describedby={describedBy}
                  aria-invalid={errors.pickup_time ? true : undefined}
                  {...register("pickup_time")}
                />
              )}
            </FieldShell>

            <FieldShell label="Pickup note" hint="Optional">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  placeholder="Ring the bell at the loading bay"
                  aria-describedby={describedBy}
                  {...register("pickup_note")}
                />
              )}
            </FieldShell>
          </>
        ) : null}

        <FieldShell label="Preferred delivery time" hint="Optional">
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="datetime-local"
              aria-describedby={describedBy}
              {...register("preferred_delivery_time")}
            />
          )}
        </FieldShell>

        <FieldShell label="Delivery note" hint="Optional">
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="Call before delivery"
              aria-describedby={describedBy}
              {...register("delivery_note")}
            />
          )}
        </FieldShell>

        <FieldShell label="Product type">
          {() => (
            <Controller
              control={control}
              name="product_type"
              render={({ field }) => (
                <Combobox
                  options={productTypeOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select product type"
                  searchPlaceholder="Search product types…"
                  allowCustomValue={false}
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell label="Send status updates">
          {({ id }) => (
            <Controller
              control={control}
              name="send_updates"
              render={({ field }) => (
                <NativeSelect
                  id={id}
                  options={YES_NO_OPTIONS}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell label="HS code known">
          {({ id }) => (
            <Controller
              control={control}
              name="have_hscode"
              render={({ field }) => (
                <NativeSelect
                  id={id}
                  options={YES_NO_OPTIONS}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </FieldShell>

        {/* Required once the answer above is "yes" — the schema enforces the
            pair, so this field only appears when it can be satisfied. */}
        {haveHsCode === "Y" ? (
          <FieldShell
            label="Consignment HS code"
            required
            error={errors.consignment_hs_code?.message}
          >
            {() => (
              <Controller
                control={control}
                name="consignment_hs_code"
                render={({ field }) => (
                  <AsyncCombobox
                    value={field.value ?? ""}
                    selectedLabel={hsCodeLabel}
                    onChange={(option) => {
                      field.onChange(option.value);
                      // The label is form state, not a lookup: the trigger has
                      // to render it long after this list has gone.
                      setValue("consignment_hs_code_label", option.label);
                    }}
                    fetchPage={hsCodeFetcher}
                    placeholder="Select or type an HS code"
                    searchPlaceholder="Search HS codes…"
                    allowCustomValue
                    aria-invalid={Boolean(errors.consignment_hs_code)}
                  />
                )}
              />
            )}
          </FieldShell>
        ) : null}

        <FieldShell
          label="Declared value"
          required
          error={errors.declared_value?.message}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="number"
              step="0.01"
              min="0"
              aria-describedby={describedBy}
              aria-invalid={errors.declared_value ? true : undefined}
              {...register("declared_value")}
            />
          )}
        </FieldShell>

        <FieldShell
          label="Declared currency"
          required
          error={errors.declared_currency?.message}
        >
          {() => (
            <Controller
              control={control}
              name="declared_currency"
              render={({ field }) => (
                <AsyncCombobox
                  value={field.value ?? ""}
                  selectedLabel={currencyLabel}
                  onChange={(option) => {
                    field.onChange(option.value);
                    setValue("declared_currency_label", option.label);
                  }}
                  fetchPage={currencyFetcher}
                  placeholder="Select currency"
                  searchPlaceholder="Search currencies…"
                  allowCustomValue
                  aria-invalid={Boolean(errors.declared_currency)}
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell
          label="Nature of goods"
          required
          error={errors.nature_of_goods?.message}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="Commercial"
              aria-describedby={describedBy}
              aria-invalid={errors.nature_of_goods ? true : undefined}
              {...register("nature_of_goods")}
            />
          )}
        </FieldShell>

        <FieldShell label="Shipper reference" hint="Your own reference code">
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="REF-123"
              aria-describedby={describedBy}
              {...register("shipper_reference_code")}
            />
          )}
        </FieldShell>

        <FieldShell
          label="Goods description"
          required
          error={errors.consignment_goods_desc?.message}
          hint="What customs will read"
          className="sm:col-span-2 lg:col-span-3"
        >
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              rows={2}
              placeholder="Consumer electronics — mobile phone accessories"
              aria-describedby={describedBy}
              aria-invalid={errors.consignment_goods_desc ? true : undefined}
              {...register("consignment_goods_desc")}
            />
          )}
        </FieldShell>
      </FieldGroup>
    </Card>
  );
}
