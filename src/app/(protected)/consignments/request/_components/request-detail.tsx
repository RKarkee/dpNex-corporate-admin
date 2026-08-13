"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useCountryOptions, useStateOptions } from "@/shared/hooks/use-location-options";
import { optionLabel, useMetaOptions } from "@/shared/hooks/use-meta-options";
import { cn } from "@/shared/lib/utils";

import { useConsignmentPermissions } from "../_hooks/use-consignment-permissions";
import { useConsignmentRequest } from "../_hooks/use-consignment-request";
import { BoxesManager } from "./boxes-manager";
import { RequestLoadError } from "./request-load-error";
import { StatusBadge, UrgencyBadge, humanizeStatus } from "./status-badges";

/**
 * The read view of one consignment request.
 *
 * Codes are resolved to names wherever a name exists — country and state
 * through the location dataset, urgency and product type through `/meta` — and
 * fall back to the code when it does not. A user reading this page should not
 * have to know that `NP` is Nepal.
 *
 * Boxes get their own component because they are editable in place; everything
 * else here is read-only and edited through the form.
 */

/** One labelled value. `0` is a value; `""`, `null` and `undefined` are not. */
function Field({
  label,
  value,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  className?: string;
}) {
  const empty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "");

  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm font-medium text-foreground">
        {empty ? "—" : value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 border-b border-border/70 pb-3 text-base font-semibold text-foreground">
        {title}
      </h2>
      <div
        className={cn(
          "grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4",
          className,
        )}
      >
        {children}
      </div>
    </Card>
  );
}

/** `"Y"` / `"N"` — sometimes padded — as words. */
function yesNo(value: unknown): string {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "Y") return "Yes";
  if (trimmed === "N") return "No";
  return trimmed;
}

/** A named field off a related resource the detail endpoint may not have expanded. */
function related(resource: unknown, key: string): string | undefined {
  if (typeof resource !== "object" || resource === null) return undefined;
  const value = (resource as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;
}

export function RequestDetail({ id }: { id: number }) {
  const { data, isPending, isError, error, refetch } = useConsignmentRequest(id);

  const { canUpdate } = useConsignmentPermissions();

  const request = data?.request;
  const sender = (request?.sender ?? {}) as Record<string, string | undefined>;
  const receiver = (request?.receiver ?? {}) as Record<string, string | undefined>;

  // Hooks must run before any early return, so these are called with the
  // undefined values the loading state has and simply return empty lists.
  const { options: countryOptions } = useCountryOptions();
  const { iso2ToName: senderStates } = useStateOptions(sender.sender_country);
  const { iso2ToName: receiverStates } = useStateOptions(receiver.receiver_country);
  const { urgencyOptions, productTypeOptions } = useMetaOptions();

  const countryName = (code?: string) =>
    code ? (countryOptions.find((o) => o.value === code)?.label ?? code) : undefined;

  if (isPending) return <RequestDetailSkeleton />;

  if (isError || !request) {
    return (
      <>
        <PageHeader title="Consignment request" />
        <RequestLoadError error={error} onRetry={() => void refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={request.request_tracking_id || `Request #${request.id}`}
        description="Everything submitted with this consignment request."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/consignments/request">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/consignments/request/${id}/edit`}>
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-6">
        <Section title="Status">
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <StatusBadge status={request.status} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Urgency
            </p>
            <UrgencyBadge
              urgency={optionLabel(urgencyOptions, request.urgency) || request.urgency}
            />
          </div>
          <Field label="Ship date" value={request.ship_date} />
          <Field label="Reference" value={request.shipper_reference_code} />
        </Section>

        <Section title="Customer">
          <Field
            label="Customer"
            value={related(request.customer, "name") ?? related(request.user, "name")}
          />
          <Field
            label="Customer type"
            value={(() => {
              const type = related(request.customer, "customer_type");
              return type ? humanizeStatus(type) : undefined;
            })()}
          />
          <Field
            label="Corporate"
            value={(() => {
              const name = related(request.corporate, "name");
              if (!name) return undefined;
              const code = related(request.corporate, "corp_code");
              return code ? `${name} (${code})` : name;
            })()}
          />
          <Field
            label="Assigned to"
            value={related(request.assigned_to, "name")}
          />
        </Section>

        <Section title="Routing">
          <Field
            label="Agent"
            value={related(request.agent, "agent_name") ?? request.agent_code}
          />
          <Field
            label="Via"
            value={related(request.via, "via_desc") ?? request.via_code}
          />
          <Field
            label="Integrator"
            value={
              related(request.integrator, "integrator_desc") ??
              request.integrator_code
            }
          />
          <Field
            label="Service"
            value={related(request.service, "value") ?? request.service_code}
          />
          <Field
            label="Package type"
            value={related(request.package, "value") ?? request.package_type}
          />
          <Field
            label="Product type"
            value={optionLabel(productTypeOptions, request.product_type)}
          />
          <Field label="Nature of goods" value={request.nature_of_goods} />
          <Field
            label="Boxes"
            value={request.no_of_boxes ?? data.boxes.length}
          />
        </Section>

        <Section title="Sender" className="lg:grid-cols-3">
          <Field
            label="Name"
            value={`${sender.sender_first_name ?? ""} ${
              sender.sender_last_name ?? ""
            }`.trim()}
          />
          <Field label="Company" value={sender.sender_company} />
          <Field label="Email" value={sender.sender_email} />
          <Field label="Phone" value={sender.sender_phone} />
          <Field label="Country" value={countryName(sender.sender_country)} />
          <Field
            label="State"
            value={
              sender.sender_state_name ||
              senderStates[sender.sender_state ?? ""] ||
              sender.sender_state
            }
          />
          <Field label="City" value={sender.sender_city} />
          <Field label="ZIP" value={sender.sender_zip} />
          <Field label="Residential" value={yesNo(sender.sender_is_resident)} />
          <Field
            label="Address"
            className="sm:col-span-2 lg:col-span-3"
            value={[sender.sender_address_1, sender.sender_address_2]
              .filter(Boolean)
              .join(", ")}
          />
        </Section>

        <Section title="Receiver" className="lg:grid-cols-3">
          <Field
            label="Name"
            value={`${receiver.receiver_first_name ?? ""} ${
              receiver.receiver_last_name ?? ""
            }`.trim()}
          />
          <Field label="Company" value={receiver.receiver_company} />
          <Field label="Email" value={receiver.receiver_email} />
          <Field label="Phone" value={receiver.receiver_phone} />
          <Field label="Country" value={countryName(receiver.receiver_country)} />
          <Field
            label="State"
            value={
              receiver.receiver_state_name ||
              receiverStates[receiver.receiver_state ?? ""] ||
              receiver.receiver_state
            }
          />
          <Field label="City" value={receiver.receiver_city} />
          <Field label="ZIP" value={receiver.receiver_zip} />
          <Field
            label="Residential"
            value={yesNo(receiver.receiver_is_resident)}
          />
          <Field
            label="Address"
            className="sm:col-span-2 lg:col-span-3"
            value={[receiver.receiver_address_1, receiver.receiver_address_2]
              .filter(Boolean)
              .join(", ")}
          />
        </Section>

        <BoxesManager
          consignmentId={id}
          permissions={{
            canAddBoxes: canUpdate,
            canUpdateBoxes: canUpdate,
            canDeleteBoxes: canUpdate,
            canAddItems: canUpdate,
            canUpdateItems: canUpdate,
            canDeleteItems: canUpdate,
          }}
        />

        <Section title="Pickup and delivery">
          <Field label="Pickup required" value={yesNo(request.need_pickup)} />
          <Field label="Pickup time" value={request.pickup_time} />
          <Field
            label="Preferred delivery"
            value={request.preferred_delivery_time}
          />
          <Field label="Status updates" value={yesNo(request.send_updates)} />
          <Field
            label="Pickup note"
            value={request.pickup_note}
            className="sm:col-span-2"
          />
          <Field
            label="Delivery note"
            value={request.delivery_note}
            className="sm:col-span-2"
          />
        </Section>

        <Section title="Declared value">
          <Field
            label="Declared value"
            value={`${request.declared_value ?? ""} ${
              request.declared_currency ?? ""
            }`.trim()}
          />
          <Field label="HS code known" value={yesNo(request.have_hscode)} />
          <Field label="HS code" value={request.consignment_hs_code} />
          <Field
            label="Goods description"
            value={request.consignment_goods_desc}
          />
        </Section>
      </div>
    </>
  );
}

/** The same card rhythm blanked out, so the page does not jump when data lands. */
function RequestDetailSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-6">
        {[4, 4, 8, 10].map((fields, card) => (
          <Card key={card} className="space-y-4 p-6">
            <Skeleton className="h-5 w-32" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: fields }).map((_, field) => (
                <div key={field} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
