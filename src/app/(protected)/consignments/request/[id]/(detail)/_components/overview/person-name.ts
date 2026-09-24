import type { WorkflowPerson } from "../../../../types";

/**
 * A readable name for a user the workflow endpoints embed.
 *
 * Their `name` is usually null while `first_name` / `last_name` are set, so
 * the parts win over nothing, the email over the parts being absent, and the
 * id is the last resort — never a blank cell.
 */
export function personName(person?: WorkflowPerson | null): string {
  if (!person) return "—";
  const full = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return (
    person.name?.trim() ||
    full ||
    person.email?.trim() ||
    (person.id !== undefined ? `User #${person.id}` : "—")
  );
}
