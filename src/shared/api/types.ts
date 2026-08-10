/** Response envelope shapes. The `data` payload is keyed differently per endpoint. */

export interface ApiEnvelope<T> {
  status: string;
  message: string;
  data: T;
}

/** Laravel's pagination block, as it arrives. */
export interface RawMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  links?: { url: string | null; label: string; active: boolean }[];
}

/** The same block after `normalizeMeta()`. */
export interface PageMeta {
  page: number;
  pageCount: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
}
