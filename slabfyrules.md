# 📜 SLABFY PROJECT RULES
*Clean code standards for humans and AI working together*

---

## 🧱 Architecture & Structure

### File Organization
- **Max 200 lines per file** - forces good decomposition
- **PascalCase** for React components (`CardScanner.tsx`)
- **kebab-case** for files and folders (`card-scanner/`)
- **Feature-based architecture** - organize by domain, not UI patterns

### Feature Structure
Each feature lives in `features/[feature-name]/` with this structure:
```
features/
  chat/
    components/     # UI components
    hooks/         # Custom hooks
    utils/         # Pure functions
    types/         # TypeScript definitions
    api.ts         # Data fetching
    schema.sql     # Database schema
    config.json    # Feature config
    README.md      # Feature documentation
    index.ts       # Public API
```

### Isolation Rules
- **Self-contained**: Features cannot import from other features
- **Explicit APIs**: All exports go through `index.ts`
- **Shared dependencies only**: Import from `@/lib`, `@/shared`, or external packages
- **Document dependencies**: List shared code usage in feature README

---

## 🤖 AI-First Documentation

Every code file starts with an internal comment block:

```tsx
// 🤖 INTERNAL NOTE:
// Purpose: Handles QR code scanning with camera input
// Exports: CardScanner component, useScanResults hook
// Feature: check-in
// Dependencies: @/lib/camera, @/shared/qr-utils
```

**Required elements:**
- What the file does
- What it exports
- Which feature it belongs to
- Key dependencies

Update when file purpose or exports change.

---

## 🎨 Design System

- **Color tokens only** - use CSS custom properties from `index.css`
- **Typography scale** - shadcn classes (`text-sm`, `text-lg`, etc.)
- **No hardcoded values** - colors, spacing, or font sizes
- **Consistent spacing** - use Tailwind spacing scale

---

## 📦 Imports & Exports

### Export Style
```tsx
// ✅ Named exports only
export { CardScanner, useScanResults }

// ❌ No default exports
export default CardScanner
```

### Import Order
1. Node built-ins (`fs`, `path`)
2. External libraries (`react`, `lodash`)
3. Shared utilities (`@/lib/*`, `@/shared/*`)
4. Local feature files (`./components/*`)

---

## 🔐 Security & Environment

- **Never commit secrets** - use `.env.local` for sensitive data
- **Environment variables** - access via `process.env.VARIABLE_NAME`
- **Keep .env.example updated** - document all required variables
- **Validate env vars** - use schema validation on startup

---

## 💻 Code Standards

### General Style
- **Functional components** with hooks
- **Explicit types** - avoid `any`, prefer specific interfaces
- **async/await** over `.then()` chains
- **Inline comments** for complex logic
- **Early returns** to reduce nesting

### TypeScript
```tsx
// ✅ Explicit interface
interface ScanResult {
  code: string
  timestamp: Date
  isValid: boolean
}

// ❌ Generic object
const result: any = { ... }
```

---

## 📊 State Management

### State Hierarchy
1. **Local state** - `useState` for component-only data
2. **Feature state** - React Context within feature boundaries
3. **Global state** - Minimal shared contexts in `@/shared`

### Context Guidelines
- One context per feature maximum
- Document state shape in feature README
- Provide custom hooks for context consumption

---

## 🧪 Testing Strategy

### Test Organization
```
features/
  chat/
    __tests__/
      components/
      hooks/
      utils/
      integration/
```

### Coverage Goals
- **70%+ overall coverage** - measured by lines and branches
- **Unit tests** - all utility functions and custom hooks
- **Integration tests** - critical user flows
- **Component tests** - complex UI logic

---

## 🔄 Data Layer

### API Organization
- **Dedicated API files** - `api.ts` per feature
- **Consistent error handling** - standardized error types
- **Loading states** - always handle pending/error/success
- **Request deduplication** - prevent duplicate calls

```tsx
// api.ts structure
export const chatApi = {
  sendMessage: async (message: string) => { ... },
  getHistory: async (limit: number) => { ... },
  // etc.
}
```

---

## 🎭 UI Patterns

### Dialog Management
- **Lazy loading** - `React.lazy()` for secondary dialogs
- **Sequential transitions** - 100ms delay between dialog switches
- **Single dialog rule** - only one modal open at a time
- **Escape handling** - always provide exit paths

### Component Props
- **Max 3 levels** - of prop drilling before using context
- **Explicit interfaces** - no generic prop types
- **Sensible defaults** - minimize required props

---

## 🔄 Development Workflow

### Pull Requests
- **Reference issues** - include task ID in title/description
- **Visual changes** - include screenshots or recordings
- **API changes** - document new routes or schema changes
- **Breaking changes** - call out compatibility impacts

### Code Reviews
- **Feature isolation** - verify no cross-feature imports
- **Internal comments** - check AI documentation blocks
- **Design system** - ensure token usage
- **Test coverage** - verify tests for new functionality

---

## 🎯 Philosophy

These rules optimize for:
- **Maintainability** - code that's easy to change
- **AI collaboration** - LLM-friendly documentation
- **Team scaling** - consistent patterns across developers
- **Long-term health** - preventing technical debt accumulation

*Remember: Rules serve the code, not the other way around. Adapt when they don't make sense.*