"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertCircle, ArrowRight, Bell, Loader, Settings, ShieldAlert } from "~/components/ui/icons";
import {
  getCurrentBrowserPushSubscription,
  getNotificationPermissionState,
  isBrowserPushSupported,
  subscribeBrowserPush,
  unsubscribeBrowserPush,
} from "~/lib/push-subscription";
import { api, type RouterOutputs } from "~/trpc/react";

type PushPreferenceItem =
  RouterOutputs["notification"]["getPushInteractionPreferences"]["preferences"][number];

export default function NotificationSettingsPage() {
  const managementContext = api.invite.getManagementContext.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const familyId = managementContext.data?.family?.id;

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h2 className="font-semibold text-xl tracking-tight">Notification Settings</h2>
        <p className="text-muted-foreground text-sm">
          Manage browser push permissions and choose which interactions send push alerts.
        </p>
      </header>

      {managementContext.isLoading ? (
        <NotificationSettingsSkeleton />
      ) : null}

      {!managementContext.isLoading && !familyId ? (
        <Alert>
          <AlertCircle className="size-5" aria-hidden="true" />
          <AlertTitle>No active family found</AlertTitle>
          <AlertDescription>Join a family before managing notification settings.</AlertDescription>
        </Alert>
      ) : null}

      {familyId ? <FamilyNotificationSettings familyId={familyId} /> : null}
    </div>
  );
}

function FamilyNotificationSettings({ familyId }: { familyId: string }) {
  const trpcUtils = api.useUtils();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [currentDeviceEndpoint, setCurrentDeviceEndpoint] = useState<string | null>(null);
  const [isDetectingCurrentDevice, setIsDetectingCurrentDevice] = useState(false);

  const pushStateQuery = api.notification.getPushSubscriptionState.useQuery(
    { familyId },
    {
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const preferencesQuery = api.notification.getPushInteractionPreferences.useQuery(
    { familyId },
    {
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const subscribePushMutation = api.notification.subscribePush.useMutation();
  const unsubscribePushMutation = api.notification.unsubscribePush.useMutation();
  const updatePreferencesMutation = api.notification.updatePushInteractionPreferences.useMutation();

  const capability = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        canPush: false,
        permission: "unsupported" as const,
      };
    }

    return {
      canPush: isBrowserPushSupported(),
      permission: getNotificationPermissionState(),
    };
  }, []);

  const isLoading = pushStateQuery.isLoading || preferencesQuery.isLoading;
  const preferences: PushPreferenceItem[] = preferencesQuery.data?.preferences ?? [];
  const subscriptions = pushStateQuery.data?.subscriptions ?? [];
  const normalizedActionError = actionError?.toLowerCase() ?? "";
  const showBraveTroubleshootingHint =
    normalizedActionError.includes("push service") ||
    normalizedActionError.includes("registration failed") ||
    normalizedActionError.includes("blocked by the browser");

  const isSubscribing = subscribePushMutation.isPending;
  const isUnsubscribing = unsubscribePushMutation.isPending;
  const isUpdatingPreference = updatePreferencesMutation.isPending;

  useEffect(() => {
    if (!capability.canPush) {
      setCurrentDeviceEndpoint(null);
      return;
    }

    let cancelled = false;
    setIsDetectingCurrentDevice(true);

    void getCurrentBrowserPushSubscription()
      .then((subscription) => {
        if (cancelled) {
          return;
        }

        setCurrentDeviceEndpoint(subscription?.endpoint ?? null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setCurrentDeviceEndpoint(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsDetectingCurrentDevice(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [capability.canPush, pushStateQuery.dataUpdatedAt]);

  const currentDeviceHasActiveSubscription =
    currentDeviceEndpoint !== null &&
    subscriptions.some((subscription) => subscription.endpoint === currentDeviceEndpoint);

  const isServerPushConfigured = Boolean(pushStateQuery.data?.isPushConfigured);
  const isActionBusy = isSubscribing || isUnsubscribing || isLoading || isDetectingCurrentDevice;

  const enablePushDisabledReason = !capability.canPush
    ? "Push is not supported by this browser."
    : !isServerPushConfigured
      ? "Server push is not configured yet."
      : capability.permission === "denied"
        ? "Browser permission is denied."
        : currentDeviceHasActiveSubscription
          ? "Push is already enabled on this device."
          : null;

  const disablePushDisabledReason = !capability.canPush
    ? "Push is not supported by this browser."
    : !currentDeviceHasActiveSubscription
      ? "No active push subscription on this device."
      : null;

  const isEnableButtonDisabled = isActionBusy || enablePushDisabledReason !== null;
  const isDisableButtonDisabled = isActionBusy || disablePushDisabledReason !== null;

  async function refreshPushData() {
    await Promise.all([
      trpcUtils.notification.getPushSubscriptionState.invalidate({ familyId }),
      trpcUtils.notification.getPushInteractionPreferences.invalidate({ familyId }),
    ]);
  }

  async function handleEnablePush() {
    setActionError(null);
    setActionSuccess(null);

    if (!capability.canPush) {
      setActionError("This browser does not support push notifications.");
      return;
    }

    if (!pushStateQuery.data?.isPushConfigured) {
      setActionError(
        "Push notifications are not configured on the server. Add VAPID env values to .env and restart the dev server.",
      );
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setActionError("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY in runtime configuration.");
      return;
    }

    let permission = getNotificationPermissionState();
    if (permission === "unsupported") {
      setActionError("Notifications are not supported by this browser.");
      return;
    }

    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      setActionError(
        "Notification permission is denied. Enable notifications in browser settings and try again.",
      );
      return;
    }

    try {
      const payload = await subscribeBrowserPush(vapidPublicKey);
      await subscribePushMutation.mutateAsync({
        familyId,
        subscriptionPayload: payload,
      });
      await refreshPushData();
      setActionSuccess("Push notifications enabled for this browser.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to enable push notifications.");
    }
  }

  async function handleDisablePush() {
    setActionError(null);
    setActionSuccess(null);

    try {
      const currentSubscription = await getCurrentBrowserPushSubscription();
      if (currentSubscription) {
        await unsubscribePushMutation.mutateAsync({
          familyId,
          endpoint: currentSubscription.endpoint,
        });
        await unsubscribeBrowserPush(currentSubscription.endpoint);
      } else {
        for (const subscription of subscriptions) {
          await unsubscribePushMutation.mutateAsync({
            familyId,
            endpoint: subscription.endpoint,
          });
        }
      }

      await refreshPushData();
      setActionSuccess("Push notifications disabled for this browser.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to disable push notifications.");
    }
  }

  async function handleTogglePreference(
    eventType: PushPreferenceItem["eventType"],
    nextValue: boolean,
  ) {
    setActionError(null);
    setActionSuccess(null);

    try {
      await updatePreferencesMutation.mutateAsync({
        familyId,
        preferences: [{ eventType, isEnabled: nextValue }],
      });
      await refreshPushData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update push preference.");
    }
  }

  return (
    <>
      <details className="group rounded-3xl border bg-card p-5 shadow-sm sm:p-6" open>
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
              Browser Push Status
            </h3>
          </div>
          <ArrowRight
            className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
        </summary>

        <div className="mt-4 space-y-4">

          {pushStateQuery.data && !pushStateQuery.data.isPushConfigured ? (
            <Alert>
              <AlertCircle className="size-5" aria-hidden="true" />
              <AlertTitle>Server push configuration missing</AlertTitle>
              <AlertDescription>
                Configure VAPID env values on the server and restart the dev server before enabling push.
              </AlertDescription>
            </Alert>
          ) : null}

          {capability.canPush ? (
            <div className="space-y-2 text-sm">
              <StatusRow
                label="Permission"
                value={capability.permission}
                emphasize
                capitalize
              />
              <StatusRow
                label="Server configuration"
                value={isServerPushConfigured ? "ready" : "missing"}
                emphasize
                capitalize
              />
              <StatusRow
                label="Member subscriptions"
                value={String(subscriptions.length)}
                emphasize
              />
              <StatusRow
                label="Current device"
                value={
                  isDetectingCurrentDevice
                    ? "checking"
                    : currentDeviceHasActiveSubscription
                      ? "enabled"
                      : "disabled"
                }
                emphasize
                capitalize
              />
            </div>
          ) : (
            <Alert>
              <ShieldAlert className="size-5" aria-hidden="true" />
              <AlertTitle>Push unavailable</AlertTitle>
              <AlertDescription>
                This browser does not support Notification, Service Worker, and PushManager APIs together.
              </AlertDescription>
            </Alert>
          )}

          {capability.permission === "denied" ? (
            <Alert>
              <ShieldAlert className="size-5" aria-hidden="true" />
              <AlertTitle>Permission denied</AlertTitle>
              <AlertDescription>
                Notifications are blocked for this site. Use browser site settings to re-enable notifications,
                then click Enable push.
              </AlertDescription>
            </Alert>
          ) : null}

          {actionError ? (
            <Alert>
              <AlertCircle className="size-5" aria-hidden="true" />
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription>
                <p>{actionError}</p>
                {showBraveTroubleshootingHint ? (
                  <p className="mt-2 text-xs">
                    Brave users: enable <span className="font-medium">Use Google services for push messaging</span>
                    in browser settings, then retry.
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {actionSuccess ? (
            <Alert>
              <Bell className="size-5" aria-hidden="true" />
              <AlertTitle>Updated</AlertTitle>
              <AlertDescription>{actionSuccess}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleEnablePush()}
              disabled={isEnableButtonDisabled}
            >
              {isSubscribing ? (
                <>
                  <Loader className="mr-2 size-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                "Enable Push"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDisablePush()}
              disabled={isDisableButtonDisabled}
            >
              {isUnsubscribing ? (
                <>
                  <Loader className="mr-2 size-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable Push"
              )}
            </Button>
          </div>

          {isActionBusy ? (
            <p className="text-muted-foreground text-xs">Checking push status...</p>
          ) : null}

          {!isActionBusy && isEnableButtonDisabled && enablePushDisabledReason ? (
            <p className="text-muted-foreground text-xs">Enable unavailable: {enablePushDisabledReason}</p>
          ) : null}

          {!isActionBusy && isDisableButtonDisabled && disablePushDisabledReason ? (
            <p className="text-muted-foreground text-xs">Disable unavailable: {disablePushDisabledReason}</p>
          ) : null}
        </div>
      </details>

      <details className="group rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
              Push Interaction Preferences
            </h3>
          </div>
          <ArrowRight
            className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
        </summary>

        <div className="mt-4 space-y-4">
          <p className="text-muted-foreground text-sm">
            Choose which interaction types trigger push delivery. If no preference exists yet, it defaults to enabled.
          </p>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {preferences.map((preference) => (
                <label
                  key={preference.eventType}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">{preference.label}</p>
                    <p className="text-muted-foreground text-xs">{preference.category}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preference.isEnabled}
                    disabled={isUpdatingPreference || isLoading}
                    onChange={(event) =>
                      void handleTogglePreference(preference.eventType, event.currentTarget.checked)
                    }
                    className="size-4 accent-primary"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </details>
    </>
  );
}

function StatusRow({
  label,
  value,
  emphasize = false,
  capitalize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${capitalize ? "capitalize" : ""} ${emphasize ? "text-foreground" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function NotificationSettingsSkeleton() {
  return (
    <section className="space-y-4 rounded-2xl border bg-card/70 p-5">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-56" />
    </section>
  );
}
