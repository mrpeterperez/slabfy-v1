import type { Config } from "tailwindcss";

export default {
  // Configure dark mode to be based on the presence of the 'dark' class
  darkMode: ["class"],
  // Specify the files where Tailwind should look for classes to generate
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // Define container configuration
    container: {
      center: true,
      padding: "1rem", // 16px padding
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px", // Max width of 1440px instead of default 1536px
      },
    },
    // Extend the default Tailwind theme
    extend: {
      // Add custom font families
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Host Grotesk', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        "primary-button":
          "linear-gradient(170deg, hsl(223, 100%, 61.8%) -19.23%, hsl(220, 83%, 53.7%) 125.81%)",
      },
      // Define custom border radius values using CSS variables
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Define custom colors using CSS variables for theming and dark mode
      colors: {
        // Base colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Card colors
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Popover colors (often similar to card)
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // Primary colors
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          container: "hsl(var(--primary-container))", // Custom container color
          subtle: "hsl(var(--primary-subtle))", // Subtle variant
        },

        // Secondary colors
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          subtle: "hsl(var(--secondary-subtle))", // Subtle variant
        },

        // Muted colors (for less emphasized text/elements)
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        // Accent colors
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          variant: "hsl(var(--accent-variant))", // Custom variant
          "variant-foreground": "hsl(var(--accent-variant-foreground))", // Custom variant foreground
          subtle: "hsl(var(--accent-subtle))", // Subtle variant
        },

        // Destructive colors (for errors, warnings, etc.)
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          subtle: "hsl(var(--destructive-subtle))", // Subtle variant
        },

        // Border, input, and ring colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // --- Added/Corrected Colors ---
        // Success colors (for positive actions/status)
        success: {
          DEFAULT: "hsl(var(--success))", // Maps to text-success, bg-success, etc.
          foreground: "hsl(var(--success-foreground))", // Maps to text-success-foreground, bg-success-foreground, etc.
          subtle: "hsl(var(--success-subtle))", // Maps to text-success-subtle, bg-success-subtle, etc.
        },
        // Warning colors (for caution/alerts)
        warning: {
          DEFAULT: "hsl(var(--warning))", // Maps to text-warning, bg-warning, etc.
          foreground: "hsl(var(--warning-foreground))", // Maps to text-warning-foreground, bg-warning-foreground, etc.
          subtle: "hsl(var(--warning-subtle))", // Maps to text-warning-subtle, bg-warning-subtle, etc.
        },
        // Brand (semantic blue)
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))",
          subtle: "hsl(var(--brand-subtle))",
        },
        // --- End Added/Corrected Colors ---

        // Ownership badge colors - simplified naming
        "blue-primary": "hsl(var(--blue-primary))",
        "blue-background": "hsl(var(--blue-background))",
        "purple-primary": "hsl(var(--purple-primary))",  
        "purple-background": "hsl(var(--purple-background))",

        // Chart colors (keeping existing definitions)
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        // Sidebar colors (keeping existing definitions)
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      // Define custom keyframes for animations
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        'star-movement-bottom': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(-100%, 0%)', opacity: '0' },
        },
        'star-movement-top': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(100%, 0%)', opacity: '0' },
        },
      },
      // Define custom animations using the keyframes
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'star-movement-bottom': 'star-movement-bottom linear infinite alternate',
        'star-movement-top': 'star-movement-top linear infinite alternate',
      },
    },
  },
  // Add Tailwind plugins
  plugins: [
    require("tailwindcss-animate"), // Plugin for animations
    // require("@tailwindcss/typography"), // Plugin for typography styles - temporarily disabled
  ],
} satisfies Config;
