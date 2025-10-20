import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { safeFieldProps } from "./form-utils";
import { z } from "zod";
import { insertAssetSchema } from "@shared/schema";

type FormValues = z.infer<typeof insertAssetSchema>;

type GradingInfoSectionProps = {
  form: UseFormReturn<FormValues>;
  readOnlyFields?: string[]; // Fields that should be displayed as read-only
};

export const GradingInfoSection = ({ form, readOnlyFields = [] }: GradingInfoSectionProps) => {
  // Helper to check if a field is read-only
  const isReadOnly = (fieldName: string) => readOnlyFields.includes(fieldName);
  const currentGrader = form.watch("grader") as string | undefined;
  const currentGrade = (form.watch("grade") as string | undefined) || "";

  const gradeChips = ["10", "9.5", "9", "8.5", "8"] as const;
  const isOtherGrade = currentGrade !== "" && !gradeChips.includes(currentGrade as any);
  const selectGrader = (val: string) => {
    form.setValue("grader", val as any, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    form.clearErrors("grader");
  };
  const selectGrade = (val: string) => {
    form.setValue("grade", val as any, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    form.clearErrors("grade");
  };
  
  return (
    <div className="space-y-4">
      {readOnlyFields.length === 0 && (
        <h3 className="text-lg font-medium font-heading">Grading Information</h3>
      )}
      
      {/* Grader */}
      {!isReadOnly("grader") ? (
        <FormField
          control={form.control}
          name="grader"
          render={() => (
            <FormItem>
              <FormLabel>Grading Company</FormLabel>
              <div className="grid grid-cols-6 gap-2">
                {(["PSA", "BGS", "CGC", "SGC", "TAG", "Other"] as const).map((opt) => (
                  <Button
                    key={opt}
                    type="button"
        size="lg"
                    variant={currentGrader === opt ? "default" : "outline"}
        className={(currentGrader === opt ? "" : "bg-primary-container") + " w-full"}
                    onClick={() => selectGrader(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {/* Grade */}
      {!isReadOnly("grade") ? (
        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade</FormLabel>
              <div className="grid grid-cols-6 gap-2">
                {gradeChips.map((g) => (
                  <Button
                    key={g}
                    type="button"
                    size="lg"
                    variant={currentGrade === g ? "default" : "outline"}
                    className={(currentGrade === g ? "" : "bg-primary-container") + " w-full"}
                    onClick={() => selectGrade(g)}
                  >
                    {g}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="lg"
                  variant={isOtherGrade || currentGrade === "" ? "default" : "outline"}
                  className={(isOtherGrade || currentGrade === "" ? "" : "bg-primary-container") + " w-full"}
                  onClick={() => selectGrade("")}
                >
                  Other
                </Button>
              </div>
              {(isOtherGrade || currentGrade === "") && (
                <div className="mt-3">
                  <FormControl>
                    <Input
                      size="lg"
                      placeholder="e.g. GEM MT 10 or 7"
                      value={(field.value as string) ?? ""}
                      onChange={(e) => {
                        field.onChange(e);
                        if (e.target.value.trim() !== "") {
                          form.clearErrors("grade");
                        }
                      }}
                    />
                  </FormControl>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {/* Cert Number */}
      {!isReadOnly("certNumber") ? (
        <FormField
          control={form.control}
          name="certNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certification Number</FormLabel>
              <FormControl>
                <Input
                  size="lg"
                  placeholder="e.g. 12345678"
                  value={(field.value as string) ?? ""}
                  onChange={(e) => {
                    field.onChange(e);
                    if (e.target.value.trim() !== "") {
                      form.clearErrors("certNumber");
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
};