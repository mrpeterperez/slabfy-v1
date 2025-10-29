// 🤖 INTERNAL NOTE:
// Purpose: Shared breadcrumbs-style page header shown above main content
// Exports: BreadcrumbsHeader (presentational), GlobalBreadcrumbs (route-aware)
// Feature: layout
// Dependencies: react, wouter (for GlobalBreadcrumbs), @/components/ui/badge (none), tailwind design tokens

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Small helper to title-case labels (tabs, fallback segments)
function titleCase(s: string): string {
  return s
    .replace(/[\-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

interface Crumb {
  label: string;
  href?: string;
  loading?: boolean; // when true, render a skeleton placeholder
}

interface BreadcrumbsHeaderProps {
  title?: string; // when provided, overrides segments and renders single title
  segments?: Crumb[]; // e.g., [{label: 'Consignment'},{label:'12345'}]
  className?: string;
  heightClass?: string; // override container height (defaults to h-40)
  ariaBusy?: boolean; // expose loading state for a11y
}

// Presentational header with border and consistent spacing
export function BreadcrumbsHeader({
  title,
  segments,
  className = "",
  heightClass = "h-10",
  ariaBusy = false,
}: BreadcrumbsHeaderProps) {
  const content = React.useMemo(() => {
    if (title)
      return (
        <span className="text-sm font-medium text-foreground">{title}</span>
      );
    const segs = (segments || []).filter(Boolean);
    if (!segs.length) return null;
    return (
      <nav aria-label="Breadcrumb" aria-busy={ariaBusy || undefined}>
        <ol className="flex items-center gap-2 text-sm text-foreground">
          {segs.map((s, i) => {
            const isLast = i === segs.length - 1;
            const node = isLast ? (
              s.loading ? (
                <span
                  className="inline-block h-4 w-4 rounded bg-muted animate-pulse"
                  aria-hidden
                />
              ) : (
                <span
                  className="truncate font-medium"
                  aria-current="page"
                  title={s.label}
                >
                  {s.label}
                </span>
              )
            ) : s.href ? (
              <Link
                href={s.href}
                className="truncate font-normal text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                title={s.label}
              >
                {s.label}
              </Link>
            ) : (
              <span
                className="truncate font-normal text-muted-foreground"
                title={s.label}
              >
                {s.label}
              </span>
            );

            return (
              <li className="flex items-center gap-2" key={`${s.label}-${i}`}>
                {i > 0 ? (
                  <span className="text-muted-foreground" aria-hidden>
                    /
                  </span>
                ) : null}
                {node}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }, [title, segments]);

  if (!content) return null;

  return (
    <div
      className={`!hidden lg:!block sticky top-0 z-20 bg-background border-b border-border ${className}`}
    >
      <div className={`max-w-full sm:px-2 py-1 flex items-center gap-1`}>
        <button
          type="button"
          aria-label="Toggle sidebar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => {
            try {
              window.dispatchEvent(
                new CustomEvent("slabfy:sidebar-toggle-visibility"),
              );
            } catch {
              window.dispatchEvent(
                new Event("slabfy:sidebar-toggle-visibility"),
              );
            }
          }}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        {content}
      </div>
    </div>
  );
}

// Route-aware wrapper used globally. Attempts to build sensible breadcrumbs
// from the current location; pages can always render BreadcrumbsHeader directly
// if they need custom labels.
export function GlobalBreadcrumbs() {
  const [path] = useLocation();

  // Hide on auth/onboarding/public storefront routes to keep those pages clean
  const hidePrefixes = React.useMemo(
    () => [
      "/signin",
      "/signup",
      "/reset-password",
      "/email-confirmed",
      "/oauth-callback",
      "/onboarding/",
      "/storefront/", // Public storefront - always full-screen, no breadcrumbs
    ],
    [],
  );

  const cacheRef = React.useRef(new Map<string, string>());
  const sessionCacheRef = React.useRef(
    new Map<
      string,
      { label: string; eventId?: string | null; eventName?: string | null }
    >(),
  );
  const [resolved, setResolved] = React.useState<string | null>(null);
  const [sessionCrumbMeta, setSessionCrumbMeta] = React.useState<{
    eventId?: string | null;
    eventName?: string | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showSkeleton, setShowSkeleton] = React.useState(false);

  // Check if we should hide this component
  const shouldHide = !path || hidePrefixes.some((p) => path.startsWith(p));

  // Attempt to resolve human-friendly titles for common child routes
  React.useEffect(() => {
    // Skip effect if component should be hidden
    if (shouldHide) return;

    let isActive = true;
    setResolved(null);
    setLoading(false);
    setShowSkeleton(false);
    setSessionCrumbMeta(null);
    // small delay to avoid skeleton flash for fast-cache cases
    const skTimer = setTimeout(() => {
      if (isActive) setShowSkeleton(true);
    }, 120);
    async function resolveTitle() {
      const normalized = path.replace(/\/$/, "");
      // Consignments detail
      if (/^\/consignments\/[A-Za-z0-9_-]+/.test(normalized)) {
        const id = normalized.split("/")[2];
        if (!id) return setResolved(null);
        const key = `consignment:${id}`;
        const cached = cacheRef.current.get(key);
        if (cached) return setResolved(cached);
        try {
          setLoading(true);
          const res = await apiRequest("GET", `/api/consignments/${id}`);
          const json = await res.json();
          const title = json?.title || null;
          if (isActive && title) {
            cacheRef.current.set(key, title);
            setResolved(title);
          }
        } catch {
          if (isActive) setResolved(null);
        } finally {
          if (isActive) setLoading(false);
        }
        return;
      }

      // Events detail
      if (/^\/events\/[A-Za-z0-9_-]+/.test(normalized)) {
        const id = normalized.split("/")[2];
        if (!id) return setResolved(null);
        const key = `event:${id}`;
        const cached = cacheRef.current.get(key);
        if (cached) return setResolved(cached);
        try {
          setLoading(true);
          const res = await apiRequest("GET", `/api/events/${id}`);
          const json = await res.json();
          const name = json?.name || null;
          if (isActive && name) {
            cacheRef.current.set(key, name);
            setResolved(name);
          }
        } catch {
          if (isActive) setResolved(null);
        } finally {
          if (isActive) setLoading(false);
        }
        return;
      }

      // Asset detail
      if (/^\/assets\/[A-Za-z0-9_-]+/.test(normalized)) {
        const id = normalized.split("/")[2];
        if (!id) return setResolved(null);
        const key = `asset:${id}`;
        const cached = cacheRef.current.get(key);
        if (cached) return setResolved(cached);
        try {
          setLoading(true);
          const res = await apiRequest("GET", `/api/assets/${id}`);
          const json = await res.json();
          const title = json?.title || null;
          if (isActive && title) {
            cacheRef.current.set(key, title);
            setResolved(title);
          }
        } catch {
          if (isActive) setResolved(null);
        } finally {
          if (isActive) setLoading(false);
        }
        return;
      }

      // Buying desk session details (including v0)
      if (/^\/buying-desk(-v0)?\/[A-Za-z0-9_-]+/.test(normalized)) {
        const pathParts = normalized.split("/");
        const id = pathParts[2];
        if (!id) return setResolved(null);
        const key = `buying-desk:${id}`;
        const cachedMeta = sessionCacheRef.current.get(key);
        if (cachedMeta) {
          setResolved(cachedMeta.label);
          setSessionCrumbMeta({
            eventId: cachedMeta.eventId,
            eventName: cachedMeta.eventName,
          });
          return;
        }
        try {
          setLoading(true);
          const res = await apiRequest(
            "GET",
            `/api/buying-desk/sessions/${id}`,
          );
          const json = await res.json();
          const label = json?.sessionNumber || json?.id || null;
          const eventData = json?.event ?? null;
          const eventId = eventData?.id ?? json?.eventId ?? null;
          const eventName = eventData?.name ?? json?.eventName ?? null;
          if (isActive && label) {
            cacheRef.current.set(key, label);
            sessionCacheRef.current.set(key, { label, eventId, eventName });
            setResolved(label);
            setSessionCrumbMeta(
              eventId || eventName ? { eventId, eventName } : null,
            );
          }
        } catch {
          if (isActive) setResolved(null);
        } finally {
          if (isActive) setLoading(false);
        }
        return;
      }

      // Collections detail
      if (/^\/collections\/[A-Za-z0-9_-]+/.test(normalized)) {
        const id = normalized.split("/")[2];
        if (!id) return setResolved(null);
        const key = `collection:${id}`;
        const cached = cacheRef.current.get(key);
        if (cached) return setResolved(cached);
        try {
          setLoading(true);
          const res = await apiRequest("GET", `/api/collections/${id}`);
          const json = await res.json();
          const name = json?.name || json?.title || null;
          if (isActive && name) {
            cacheRef.current.set(key, name);
            setResolved(name);
          }
        } catch {
          if (isActive) setResolved(null);
        } finally {
          if (isActive) setLoading(false);
        }
        return;
      }

      // Contacts detail
      if (/^\/contacts\/[A-Za-z0-9_-]+/.test(normalized)) {
        const id = normalized.split("/")[2];
        if (!id) return setResolved(null);
        const key = `contact:${id}`;
        const cached = cacheRef.current.get(key);
        if (cached) return setResolved(cached);
        try {
          setLoading(true);
          const res = await apiRequest("GET", `/api/contacts/${id}`);
          const json = await res.json();
          const name = json?.name || null;
          if (isActive && name) {
            cacheRef.current.set(key, name);
            setResolved(name);
          }
        } catch {
          if (isActive) setResolved(null);
        } finally {
          if (isActive) setLoading(false);
        }
        return;
      }

      setResolved(null);
    }

    resolveTitle();
    return () => {
      isActive = false;
      clearTimeout(skTimer);
    };
  }, [path, shouldHide]);

  const build = (p: string): { title?: string; segments?: Crumb[] } => {
    // Normalize trailing slash
    const normalized = p.replace(/\/$/, "");
    // Direct mappings for parent pages
    const parents: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/portfolio": "My Portfolio",
      "/my-portfolio": "My Portfolio",
      "/my-portfolio-v0": "My Portfolio",
      "/events": "Shows",
      "/consignments": "Consignments",
      "/buying-desk": "Buying Desk",
      "/buying-desk-v0": "Buying Desk",
      "/collections": "Collections",
      "/contacts": "Contacts",
      "/analytics": "Analytics",
      "/chats": "Chats",
      "/profile": "Profile",
    };

    if (parents[normalized]) return { title: parents[normalized] };

    // Child routes: consignment details
    if (/^\/consignments\/[A-Za-z0-9_-]+/.test(normalized)) {
      const parts = normalized.split("/");
      const id = parts[2] || "";
      const tab = parts[3];
      const segs: Crumb[] = [
        { label: "Consignment", href: "/consignments" },
        ...(resolved
          ? [{ label: resolved, href: `/consignments/${id}` } as Crumb]
          : []),
        ...(!resolved && loading && showSkeleton
          ? [{ label: "Loading", loading: true } as Crumb]
          : []),
      ];
      if (tab && resolved) segs.push({ label: titleCase(tab) });
      return { segments: segs };
    }

    // Events detail
    if (/^\/events\/[A-Za-z0-9_-]+/.test(normalized)) {
      const parts = normalized.split("/");
      const id = parts[2] || "";
      const tab = parts[3];
      const segs: Crumb[] = [
        { label: "Shows", href: "/events" },
        ...(resolved
          ? [{ label: resolved, href: `/events/${id}` } as Crumb]
          : []),
        ...(!resolved && loading && showSkeleton
          ? [{ label: "Loading", loading: true } as Crumb]
          : []),
      ];
      if (tab && resolved) segs.push({ label: titleCase(tab) });
      return { segments: segs };
    }

    // Asset details and sub-tabs
    if (/^\/assets\/[A-Za-z0-9_-]+/.test(normalized)) {
      const parts = normalized.split("/");
      const id = parts[2] || "";
      const tab = parts[3];
      const segs: Crumb[] = [
        { label: "My Portfolio", href: "/my-portfolio-v0" },
        ...(resolved
          ? [{ label: resolved, href: `/assets/${id}` } as Crumb]
          : []),
        ...(!resolved && loading && showSkeleton
          ? [{ label: "Loading", loading: true } as Crumb]
          : []),
      ];
      if (tab && resolved) segs.push({ label: titleCase(tab) });
      return { segments: segs };
    }

    // Buying desk session details (including v0)
    if (/^\/buying-desk(-v0)?\/[A-Za-z0-9_-]+/.test(normalized)) {
      const parts = normalized.split("/");
      const id = parts[2] || "";
      const tab = parts[3];
      // Always use clean URLs in breadcrumbs
      const parentHref =
        parts[1] === "buying-desk-v0" ? "/buying-desk-v0" : "/buying-desk";
      const itemHref = `${parentHref}/${id}`;
      const segs: Crumb[] = [];
      if (sessionCrumbMeta?.eventId && sessionCrumbMeta.eventName) {
        segs.push({ label: "Events", href: "/events" });
        segs.push({
          label: sessionCrumbMeta.eventName,
          href: `/events/${sessionCrumbMeta.eventId}`,
        });
        segs.push({ label: "Buy Session", href: `/events/${sessionCrumbMeta.eventId}/buy-sessions` });
      } else {
        segs.push({ label: "Buy Session", href: parentHref });
      }
      if (resolved) segs.push({ label: resolved, href: itemHref } as Crumb);
      else if (loading && showSkeleton)
        segs.push({ label: "Loading", loading: true } as Crumb);
      if (tab && resolved) segs.push({ label: titleCase(tab) });
      return { segments: segs };
    }

    // Collections detail
    if (/^\/collections\/[A-Za-z0-9_-]+/.test(normalized)) {
      const parts = normalized.split("/");
      const id = parts[2] || "";
      const tab = parts[3];
      const segs: Crumb[] = [
        { label: "Collections", href: "/collections" },
        ...(resolved
          ? [{ label: resolved, href: `/collections/${id}` } as Crumb]
          : []),
        ...(!resolved && loading && showSkeleton
          ? [{ label: "Loading", loading: true } as Crumb]
          : []),
      ];
      if (tab && resolved) segs.push({ label: titleCase(tab) });
      return { segments: segs };
    }

    // Contacts detail
    if (/^\/contacts\/[A-Za-z0-9_-]+/.test(normalized)) {
      const parts = normalized.split("/");
      const id = parts[2] || "";
      const segs: Crumb[] = [
        { label: "Contacts", href: "/contacts" },
        ...(resolved
          ? [{ label: resolved, href: `/contacts/${id}` } as Crumb]
          : []),
        ...(!resolved && loading && showSkeleton
          ? [{ label: "Loading", loading: true } as Crumb]
          : []),
      ];
      return { segments: segs };
    }

    // Fallback: use last segment as title-cased label
    const seg = normalized.split("/").filter(Boolean);
    if (!seg.length) return { title: "" };
    const last = titleCase(seg[seg.length - 1]);
    return { title: last };
  };

  // Return null if component should be hidden, otherwise render breadcrumbs
  if (shouldHide) return null;

  const { title, segments } = build(path);
  return (
    <BreadcrumbsHeader title={title} segments={segments} ariaBusy={loading} />
  );
}
