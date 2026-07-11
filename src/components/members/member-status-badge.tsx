import { Badge } from "~/components/ui/badge";
import { BadgeAlertIcon, Check, Clock3 } from "~/components/ui/icons";
import type { FamilyMemberStatus } from "~/lib/mocks/family-members";

type LabelVisibility = "visible" | "hover";

type MemberStatusBadgeProps = {
  status: FamilyMemberStatus;
  hasPendingClaimInvite?: boolean;
  className?: string;
  labelVisibility?: LabelVisibility;
};

function StatusLabel({
  children,
  labelVisibility = "visible",
}: {
  children: string;
  labelVisibility?: LabelVisibility;
}) {
  if (labelVisibility === "hover") {
    return (
      <span className="sr-only group-hover/badge:not-sr-only group-hover/badge:ml-1">
        {children}
      </span>
    );
  }

  return <span>{children}</span>;
}

export function MemberStatusBadge({
  status,
  hasPendingClaimInvite = false,
  className,
  labelVisibility = "visible",
}: MemberStatusBadgeProps) {
  const isClaimed = status === "claimed";
  const showClaimPending = !isClaimed && hasPendingClaimInvite;

  if (showClaimPending) {
    return <ClaimPendingBadge className={className} labelVisibility={labelVisibility} />;
  }

  return (
    <Badge
      className={className}
      variant={isClaimed ? "default" : "outline"}
    >
      {isClaimed ? (
        <Check data-icon="inline-start" aria-hidden="true" />
      ) : (
        <BadgeAlertIcon data-icon="inline-start" aria-hidden="true" />
      )}
      <StatusLabel labelVisibility={labelVisibility}>
        {isClaimed ? "Claimed" : "Unclaimed"}
      </StatusLabel>
    </Badge>
  );
}

export function ClaimPendingBadge({
  className,
  labelVisibility = "visible",
}: {
  className?: string;
  labelVisibility?: LabelVisibility;
}) {
  return (
    <Badge className={className} variant="secondary">
      <Clock3 data-icon="inline-start" aria-hidden="true" />
      <StatusLabel labelVisibility={labelVisibility}>Claim pending</StatusLabel>
    </Badge>
  );
}
