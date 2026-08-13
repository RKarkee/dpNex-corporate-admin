import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";

import type {
  ConsignmentFormInput,
  ConsignmentFormValues,
} from "../schema";

/**
 * The react-hook-form handles, bound to the consignment form's types.
 *
 * Everything a field component touches is keyed to the schema's **input**
 * type — that is what the controls actually hold, since a number input yields
 * a string until the resolver coerces it. Only `Control` carries the output
 * type as well, because `handleSubmit` produces it.
 *
 * Aliased here so the eight components below share one definition; spelling
 * the generics out at each prop is where they drift.
 */
export type ConsignmentControl = Control<
  ConsignmentFormInput,
  unknown,
  ConsignmentFormValues
>;

export type ConsignmentRegister = UseFormRegister<ConsignmentFormInput>;
export type ConsignmentErrors = FieldErrors<ConsignmentFormInput>;
export type ConsignmentSetValue = UseFormSetValue<ConsignmentFormInput>;
export type ConsignmentWatch = UseFormWatch<ConsignmentFormInput>;
