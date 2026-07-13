"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, House, Image, Plus, Settings, Sparkles, User, Users } from "~/components/ui/icons";

import { FamilyLogotypeLockup } from "~/components/branding/family-logotype-lockup";
import { useGlobalComposer } from "~/components/feed/global-composer-provider";
import { formatUnreadBadgeCount } from "~/components/nav/unread-badge";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { getFeatureNavigationMetadata } from "~/lib/ffeatures/activation";
import { tryParseBrandingConfig } from "~/lib/branding/branding-config";
import { normalizeFamilyNameInput } from "~/lib/family-name";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Logo } from "~/components/ui/logo";

const baseItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/members", label: "Members", icon: Users },
  { href: "/gallery", label: "Gallery", icon: Image },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/members" && pathname.startsWith("/member/")) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSettingsPath(pathname: string) {
  return pathname === "/settings" || pathname.startsWith("/settings/") || pathname.startsWith("/setting/");
}

export function DesktopSidebar({ primaryLockup }: { primaryLockup: string }) {
  const pathname = usePathname();
  const { openComposer } = useGlobalComposer();
  const shouldPollUnread = !pathname.startsWith("/notifications");

  const managementContext = api.family.getManagementContext.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const familyId = managementContext.data?.family?.id;
  const parsedBrandingConfig = tryParseBrandingConfig(managementContext.data?.family?.brandingConfig ?? null);
  const selectedLogotypeFontName =
    parsedBrandingConfig?.logotype.enabled ? (parsedBrandingConfig.logotype.fontName ?? null) : null;
  const selectedFamilyName = normalizeFamilyNameInput(managementContext.data?.family?.name ?? "") || "Family";
  const selectedFamilyInitial = Array.from(selectedFamilyName)[0] ?? "F";
  const unreadCountQuery = api.notification.getUnreadCount.useQuery(
    {
      familyId: familyId ?? "",
    },
    {
      enabled: Boolean(familyId),
      retry: false,
      refetchOnWindowFocus: shouldPollUnread,
      refetchInterval: shouldPollUnread ? 30_000 : false,
    },
  );

  const featureActivationQuery = api.ffeatures.listActivations.useQuery(
    {
      familyId: familyId ?? "",
    },
    {
      enabled: Boolean(familyId),
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const items = useMemo(() => {
    const featureItems = getFeatureNavigationMetadata(
      featureActivationQuery.data?.activations ?? [],
    ).map((featureNav) => ({
      href: featureNav.href,
      label: featureNav.label,
      icon: Sparkles,
    }));

    return [...baseItems, ...featureItems];
  }, [featureActivationQuery.data?.activations]);

  const unreadLabel = formatUnreadBadgeCount(unreadCountQuery.data?.count ?? 0);

  return (
    <aside className="fixed top-0 left-0 hidden h-screen w-20 border-r border-border bg-background md:flex md:flex-col lg:w-72">
      <div className={`flex h-16 items-center justify-center px-2 lg:justify-start lg:px-6 ${selectedLogotypeFontName && "lg:ml-2"}`}>
        <Link href="/" className="inline-flex items-center justify-center gap-2" aria-label={`${primaryLockup} home`}>
          {selectedLogotypeFontName ? (
            <>
              <span
                className="inline-flex select-none text-4xl leading-none text-foreground lg:hidden"
                style={{ fontFamily: `"${selectedLogotypeFontName}", cursive` }}
                aria-hidden="true"
              >
                {selectedFamilyInitial}
              </span>
              <FamilyLogotypeLockup
                familyName={selectedFamilyName}
                fontName={selectedLogotypeFontName}
                className="hidden px-4 lg:inline-flex"
                familyNameClassName="text-[40px]"
                leadingClassName="text-xs"
                trailingClassName="text-xs translate-y-[90%]"
              />
            </>
          ) : (
            <>
              <Logo className="h-6 w-auto text-foreground" aria-hidden="true" />
              <span className="hidden font-semibold text-2xl leading-none tracking-tight lg:inline">Fircle</span>
            </>
          )}
        </Link>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-2 px-2 lg:px-4">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              size="default"
              title={item.label}
              className={cn(
                "h-12 w-full justify-center rounded-full px-0 text-base text-foreground lg:justify-start lg:gap-3 lg:px-4",
                active && "bg-muted font-semibold hover:bg-muted"
              )}
            >
              <Link href={item.href} aria-label={item.label} className="inline-flex w-full items-center justify-center lg:justify-start lg:gap-3">
                <span className="relative inline-flex">
                  <Icon className="size-6" />
                  {item.href === "/notifications" && unreadLabel ? (
                    <span className="absolute -top-2 -right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {unreadLabel}
                    </span>
                  ) : null}
                </span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            </Button>
          );
        })}
        <Button
          type="button"
          title="Create"
          aria-label="Create"
          onClick={() => openComposer()}
          className={cn(
            "h-12 w-full justify-center rounded-full px-0 text-base lg:justify-start lg:gap-3 lg:px-4",
            "bg-primary text-primary-foreground hover:bg-primary/80"
          )}
        >
          <span className="inline-flex w-full items-center justify-center lg:justify-start lg:gap-3">
            <Plus className="size-6" />
            <span className="hidden lg:inline">Create</span>
          </span>
        </Button>
      </nav>

      <div className="flex flex-col gap-2 px-2 pb-4 lg:px-4">
        <ThemeToggle
          title="Toggle theme"
          className={cn(
            "h-12 w-full justify-center rounded-full px-0 text-base lg:w-fit lg:justify-start lg:gap-3 lg:px-4 [&_span]:hidden lg:[&_span]:inline",
            "text-foreground"
          )}
        />
        <Button
          asChild
          variant="ghost"
          title="Settings"
          aria-label="Settings"
          className={cn(
            "h-12 w-full justify-center rounded-full px-0 text-base lg:w-fit lg:justify-start lg:gap-3 lg:px-4",
            isSettingsPath(pathname)
              ? "bg-muted font-semibold text-foreground hover:bg-muted"
              : "text-foreground"
          )}
        >
          <Link href="/settings" className="inline-flex w-full items-center justify-center lg:justify-start lg:gap-3">
            <Settings className="size-6" />
            <span className="hidden lg:inline">Settings</span>
          </Link>
        </Button>
      </div>
    </aside>
  );
}
