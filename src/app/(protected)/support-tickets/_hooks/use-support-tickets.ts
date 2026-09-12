"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listSupportTickets } from "../services/support-ticket.service";
import type { TicketFilterValues } from "../types";
import { supportTicketKeys } from "./query-keys";

/**
 * One page of `/corporate/supporttickets`.
 *
 * `keepPreviousData` is what makes paging and filtering feel settled: the table
 * keeps the rows it has while the next answer is in flight instead of
 * collapsing to a skeleton and back. The filter bar applies on submit, so this
 * never fires per keystroke.
 */
export function useSupportTickets(
  page: number,
  filters: TicketFilterValues,
  perPage = 15,
) {
  return useQuery({
    queryKey: supportTicketKeys.list({ page, perPage, filters }),
    queryFn: ({ signal }) =>
      listSupportTickets({ page, perPage, ...filters, signal }),
    placeholderData: keepPreviousData,
  });
}
