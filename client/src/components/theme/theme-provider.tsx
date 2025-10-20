import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps as NextThemesProviderProps } from "next-themes";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "slabfy-ui-theme",
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      enableSystem={true}
      disableTransitionOnChange={false}
      enableColorScheme={true}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
