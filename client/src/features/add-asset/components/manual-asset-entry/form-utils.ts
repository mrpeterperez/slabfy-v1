import type { ControllerRenderProps } from "react-hook-form";

/**
 * Helper function to safely handle potentially null/undefined field values in form inputs
 */
export const safeFieldProps = (field: ControllerRenderProps<any, any>) => ({
  ...field,
  value: field.value ?? "",
});