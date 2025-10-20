import type { ControllerRenderProps } from "react-hook-form";

/**
 * Helper function to safely handle potentially null field values in form inputs
 */
export const safeFieldProps = (field: ControllerRenderProps<any, any>) => ({
  ...field,
  value: field.value === null ? "" : field.value,
});
