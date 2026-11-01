"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { useInvoicePermissions } from "../_hooks/use-invoice-permissions";

/** The header link to the statement page, for those who may open it. */
export function StatementButton() {
  const { canViewStatement } = useInvoicePermissions();
  if (!canViewStatement) return null;

  return (
    <Button variant="outline" asChild>
      <Link href="/billing/invoices/statement">
        <FileText className="size-4" />
        Bill statement
      </Link>
    </Button>
  );
}
