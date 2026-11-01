import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatDateTime } from "@/shared/lib/dates";

import { AccountStatusBadge, DefaultAccountBadge } from "../../_components/account-badges";
import { isPrimaryAddress, text } from "../../lib/account-format";
import { isDefaultAccount, type BillingAccount } from "../../types";
import { AddressCard } from "./address-card";
import { Field, Section } from "./detail-parts";

/**
 * One billing account, in full: identity and state, the account's own
 * details, then every address — the primary one first.
 */
export function AccountDetail({ account }: { account: BillingAccount }) {
  const addresses = [...(account.addresses ?? [])].sort(
    (a, b) => Number(isPrimaryAddress(b)) - Number(isPrimaryAddress(a)),
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <span className="font-mono text-base font-semibold text-foreground">
            {text(account.billing_account_code) ?? `#${account.id}`}
          </span>
          <AccountStatusBadge account={account} />
          {isDefaultAccount(account) ? <DefaultAccountBadge /> : null}
        </CardContent>
      </Card>

      <Section title="Account">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Account name" value={text(account.account_name)} />
          <Field label="Legal name" value={text(account.legal_name)} />
          <Field label="Code" value={text(account.billing_account_code)} />
          <Field label="PAN" value={text(account.pan)} />
          <Field label="VAT" value={text(account.vat)} />
          <Field label="Email" value={text(account.email)} />
          <Field label="Phone 1" value={text(account.phone_1)} />
          <Field label="Phone 2" value={text(account.phone_2)} />
          <Field label="Status" value={<AccountStatusBadge account={account} />} />
          <Field label="Created" value={formatDateTime(account.created_at)} />
          <Field label="Updated" value={formatDateTime(account.updated_at)} />
        </div>
      </Section>

      <Section title={`Addresses (${addresses.length})`}>
        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {addresses.map((address) => (
              <AddressCard key={address.id} address={address} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No addresses on this account.</p>
        )}
      </Section>
    </div>
  );
}

export function AccountDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
