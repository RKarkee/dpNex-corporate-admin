import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";

import type {
  ConsignmentAdminFormInput,
  ConsignmentAdminFormValues,
} from "../schema";

/**
 * The react-hook-form handles, bound to this module's form types.
 *
 * Everything a field component touches is keyed to the schema's **input**
 * type — that is what the controls actually hold, since a number input yields a
 * string until the resolver coerces it. Only `Control` carries the output type
 * as well, because `handleSubmit` produces it.
 *
 * Aliased here so the field components share one definition; spelling the
 * generics out at each prop is where they drift.
 */
export type AdminControl = Control<
  ConsignmentAdminFormInput,
  unknown,
  ConsignmentAdminFormValues
>;

export type AdminRegister = UseFormRegister<ConsignmentAdminFormInput>;
export type AdminErrors = FieldErrors<ConsignmentAdminFormInput>;
export type AdminSetValue = UseFormSetValue<ConsignmentAdminFormInput>;
export type AdminWatch = UseFormWatch<ConsignmentAdminFormInput>;
