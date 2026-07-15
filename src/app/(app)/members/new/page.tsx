"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, Check, CheckCircle2, Copy, Link2, Loader, Plus, Send, TriangleAlert, User, UserRoundPlus, X } from "~/components/ui/icons";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { beginNavigationProgress } from "~/components/nav/navigation-progress";
import { createInstantPreviewUrl, resolveMediaMimeType } from "~/lib/media-compression";
import { api } from "~/trpc/react";

type UploadIntentItem = {
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  readUrl: string;
};

type AddMode = "single" | "bulk";

type BulkMemberRow = {
  id: string;
  name: string;
  error: string | null;
};

type BulkCreationResult = {
  id: string;
  name: string;
  status: "created" | "failed";
  message?: string;
};

const ACCEPTED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_AVATAR_BYTES = 15 * 1024 * 1024;

function uploadFileWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading photo."));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.send(file);
  });
}

function createBulkRow(): BulkMemberRow {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    name: "",
    error: null,
  };
}

export default function AddMemberPage() {
  const router = useRouter();
  const trpcUtils = api.useUtils();
  const [addMode, setAddMode] = useState<AddMode>("single");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberNickname, setMemberNickname] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [shouldGenerateInvite, setShouldGenerateInvite] = useState(false);
  const [autoClaimInvite, setAutoClaimInvite] = useState<{
    code: string;
    invitedEmail: string | null;
  } | null>(null);
  const [isClaimLinkCopied, setIsClaimLinkCopied] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedAvatarPreviewUrl, setSelectedAvatarPreviewUrl] = useState<string | null>(null);
  const [isPreviewConverting, setIsPreviewConverting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailDelivery, setEmailDelivery] = useState<{
    status: "sent" | "skipped" | "failed";
    reasonCode?: string;
    message?: string;
  } | null>(null);
  const [claimInviteId, setClaimInviteId] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkMemberRow[]>(() => [createBulkRow(), createBulkRow()]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkCreationResult[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarPreviewSelectionRef = useRef(0);

  const managementContext = api.family.getManagementContext.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const selectedFamilyId = managementContext.data?.family?.id ?? null;
  const canManageMembers =
    managementContext.data?.role === "OWNER" || managementContext.data?.role === "ADMIN";
  const showPermissionDenied =
    !managementContext.isLoading && selectedFamilyId && !canManageMembers;
  const hasEmail = memberEmail.trim().length > 0;
  const shouldGenerateInviteNow = hasEmail || shouldGenerateInvite;
  const isContextBlocked =
    managementContext.isLoading ||
    !selectedFamilyId ||
    !canManageMembers;

  useEffect(() => {
    if (showPermissionDenied) {
      beginNavigationProgress();
      router.replace("/members");
    }
  }, [router, showPermissionDenied]);

  useEffect(() => {
    return () => {
      if (selectedAvatarPreviewUrl) {
        URL.revokeObjectURL(selectedAvatarPreviewUrl);
      }
    };
  }, [selectedAvatarPreviewUrl]);

  const createMember = api.familyMember.createUnclaimedMember.useMutation();
  const updateMemberProfile = api.familyMember.updateMemberProfile.useMutation();
  const retryEmailSend = api.invite.retryEmailSend.useMutation({
    onSuccess: (result) => {
      setEmailDelivery(result.emailDelivery);
    },
    onError: (error) => {
      setEmailDelivery({
        status: "failed",
        message: error.message,
      });
    },
  });

  const handleAvatarSelected = (file: File | null) => {
    if (!file) return;
    setFormError(null);

    if (!ACCEPTED_AVATAR_MIME_TYPES.has(resolveMediaMimeType(file))) {
      setFormError("Please select a supported image format (jpg, png, webp, heic, heif).");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setFormError("Avatar image exceeds the 15MB size limit.");
      return;
    }

    if (selectedAvatarPreviewUrl) {
      URL.revokeObjectURL(selectedAvatarPreviewUrl);
    }

    const resolvedMimeType = resolveMediaMimeType(file);
    const shouldShowPreviewConversion =
      resolvedMimeType === "image/heic" || resolvedMimeType === "image/heif";

    const selectionId = ++avatarPreviewSelectionRef.current;
    setIsPreviewConverting(shouldShowPreviewConversion);
    const previewUrl = createInstantPreviewUrl(file, (upgradedPreviewUrl) => {
      if (avatarPreviewSelectionRef.current !== selectionId) {
        URL.revokeObjectURL(upgradedPreviewUrl);
        return;
      }

      setSelectedAvatarPreviewUrl((currentPreviewUrl) => {
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }
        return upgradedPreviewUrl;
      });
      setIsPreviewConverting(false);
    }, () => {
      if (avatarPreviewSelectionRef.current !== selectionId) {
        return;
      }

      setIsPreviewConverting(false);
    });

    setSelectedAvatarFile(file);
    setSelectedAvatarPreviewUrl(previewUrl);
    setUploadProgress(0);
  };

  const handleRemoveAvatar = () => {
    avatarPreviewSelectionRef.current += 1;

    if (selectedAvatarPreviewUrl) {
      URL.revokeObjectURL(selectedAvatarPreviewUrl);
    }
    setSelectedAvatarFile(null);
    setSelectedAvatarPreviewUrl(null);
    setUploadProgress(0);
    setIsPreviewConverting(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const normalizedName = memberName.trim();
    const normalizedNickname = memberNickname.trim();
    const normalizedEmail = memberEmail.trim();
    const generateClaimInvite = normalizedEmail.length > 0 || shouldGenerateInvite;

    if (!normalizedName) {
      setFormError("Member name is required.");
      return;
    }

    if (!selectedFamilyId) {
      setFormError("No family context was found for your account.");
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const data = await createMember.mutateAsync({
        familyId: selectedFamilyId,
        name: normalizedName,
        nickname: normalizedNickname.length > 0 ? normalizedNickname : undefined,
        email: normalizedEmail.length > 0 ? normalizedEmail : undefined,
        generateClaimInvite,
      });

      if (selectedAvatarFile) {
        const intentsResponse = await fetch("/api/uploads/intent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            familyId: selectedFamilyId,
            uploadFor: "avatar",
            memberId: data.id,
            files: [
              {
                fileName: selectedAvatarFile.name,
                mimeType: selectedAvatarFile.type,
                sizeBytes: selectedAvatarFile.size,
              },
            ],
          }),
        });

        const intentBody = (await intentsResponse.json()) as {
          intents?: UploadIntentItem[];
          error?: { message?: string };
        };

        if (!intentsResponse.ok || !intentBody.intents?.[0]) {
          throw new Error(intentBody.error?.message ?? "Failed to create avatar upload intent.");
        }

        const avatarIntent = intentBody.intents[0];
        await uploadFileWithProgress(
          avatarIntent.uploadUrl,
          selectedAvatarFile,
          avatarIntent.requiredHeaders,
          setUploadProgress,
        );

        await updateMemberProfile.mutateAsync({
          familyId: selectedFamilyId,
          memberId: data.id,
          name: normalizedName,
          nickname: normalizedNickname.length > 0 ? normalizedNickname : undefined,
          image: avatarIntent.readUrl,
        });
      }

      setIsSubmitted(true);
      setAutoClaimInvite(
        data.claimInvite
          ? {
              code: data.claimInvite.code,
              invitedEmail: data.claimInvite.invitedEmail,
            }
          : null,
      );
      setClaimInviteId(data.claimInvite?.id ?? null);
      setEmailDelivery(data.emailDelivery ?? null);
      setIsClaimLinkCopied(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateBulkRow = (rowId: string, value: string) => {
    setBulkRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              name: value,
              error: null,
            }
          : row,
      ),
    );
  };

  const handleAddBulkRow = () => {
    setBulkRows((currentRows) => [...currentRows, createBulkRow()]);
  };

  const handleRemoveBulkRow = (rowId: string) => {
    setBulkRows((currentRows) => {
      if (currentRows.length <= 1) return currentRows;
      return currentRows.filter((row) => row.id !== rowId);
    });
  };

  const handleBulkSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBulkSaving) return;

    if (!selectedFamilyId) {
      setBulkError("No family context was found for your account.");
      return;
    }

    const preparedRows: Array<{ id: string; name: string }> = bulkRows.map((row) => ({
      id: row.id,
      name: row.name.trim(),
    }));

    const hasAnyName = preparedRows.some((row) => row.name.length > 0);
    if (!hasAnyName) {
      setBulkRows((currentRows) =>
        currentRows.map((row) => ({
          ...row,
          error: "Member name is required.",
        })),
      );
      setBulkError("Add at least one member name before creating.");
      return;
    }

    const validationErrors = new Map<string, string>();

    preparedRows.forEach((row) => {
      if (!row.name) {
        return;
      }

      if (row.name.length > 120) {
        validationErrors.set(row.id, "Name must be 120 characters or fewer.");
      }
    });

    if (validationErrors.size > 0) {
      setBulkRows((currentRows) =>
        currentRows.map((row) => ({
          ...row,
          error: validationErrors.get(row.id) ?? null,
        })),
      );
      setBulkError("One or more names need to be corrected.");
      return;
    }

    const rowsToCreate: Array<{ id: string; name: string }> = preparedRows.filter(
      (row) => row.name.length > 0,
    );

    setBulkError(null);
    setBulkResults([]);
    setIsBulkSaving(true);
    setBulkProgress({ completed: 0, total: rowsToCreate.length });

    const nextResults: BulkCreationResult[] = [];

    try {
      let completed = 0;

      for (const row of rowsToCreate) {
        if (!row) {
          continue;
        }

        try {
          await createMember.mutateAsync({
            familyId: selectedFamilyId,
            name: row.name,
          });

          nextResults.push({
            id: row.id,
            name: row.name,
            status: "created",
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";

          nextResults.push({
            id: row.id,
            name: row.name,
            status: "failed",
            message,
          });
        } finally {
          completed += 1;
          setBulkProgress({
            completed,
            total: rowsToCreate.length,
          });
        }
      }

      setBulkResults(nextResults);

      const failedResults = nextResults.filter((result) => result.status === "failed");
      setBulkRows(
        failedResults.length > 0
          ? failedResults.map((result) => ({
              id: result.id,
              name: result.name,
              error: result.message ?? "Unable to create this member.",
            }))
          : [createBulkRow(), createBulkRow()],
      );

      if (nextResults.some((result) => result.status === "created")) {
        await trpcUtils.familyMember.listFamilyMembers.invalidate({
          familyId: selectedFamilyId,
        });
      }

      if (failedResults.length > 0) {
        setBulkError(
          `${failedResults.length} ${failedResults.length === 1 ? "member" : "members"} could not be created. Fix and retry.`,
        );
      }
    } finally {
      setIsBulkSaving(false);
      setBulkProgress(null);
    }
  };

  const handleAddAnother = () => {
    avatarPreviewSelectionRef.current += 1;

    setMemberName("");
    setMemberNickname("");
    setMemberEmail("");
    setShouldGenerateInvite(false);
    setAutoClaimInvite(null);
    setIsClaimLinkCopied(false);
    setEmailDelivery(null);
    setClaimInviteId(null);
    if (selectedAvatarPreviewUrl) {
      URL.revokeObjectURL(selectedAvatarPreviewUrl);
    }
    setSelectedAvatarFile(null);
    setSelectedAvatarPreviewUrl(null);
    setUploadProgress(0);
    setIsPreviewConverting(false);
    setIsSubmitted(false);
    setFormError(null);
  };

  const autoClaimUrl = autoClaimInvite
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth/claim/${autoClaimInvite.code}`
    : null;

  const handleCopyClaimLink = async () => {
    if (!autoClaimUrl) return;
    await navigator.clipboard.writeText(autoClaimUrl);
    setIsClaimLinkCopied(true);
    setTimeout(() => setIsClaimLinkCopied(false), 2000);
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">Add a family member</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Create an unclaimed profile so your family circle includes people who have not joined yet.
        </p>
      </header>

      {showPermissionDenied ? (
        <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-7">
          <Alert variant="destructive">
            <AlertCircle className="size-5" aria-hidden="true" />
            <AlertTitle>Permission denied</AlertTitle>
            <AlertDescription>
              Only family owners and admins can create member profiles.
            </AlertDescription>
          </Alert>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild type="button" variant="outline">
              <Link href="/members">Back to members</Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex w-full rounded-full border bg-muted/40 p-1 sm:inline-flex sm:w-auto">
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-1.5 text-center text-sm font-medium transition sm:flex-none ${addMode === "single" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setAddMode("single")}
              disabled={isSaving || isBulkSaving}
            >
              Single Member
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-1.5 text-center text-sm font-medium transition sm:flex-none ${addMode === "bulk" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setAddMode("bulk")}
              disabled={isSaving || isBulkSaving}
            >
              Multiple Members
            </button>
          </div>

          {addMode === "single" && isSubmitted ? (
            <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-medium text-lg">Member profile created</h2>
                  <p className="text-sm text-muted-foreground">
                    {memberName || "This person"} was added as an unclaimed family member profile.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    They can claim this profile later using a claim invite.
                  </p>
                  {autoClaimInvite && autoClaimUrl ? (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">
                      <p className="font-medium text-primary">Claim invite created automatically</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border bg-background/80 px-2 py-2">
                        <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <p className="min-w-0 flex-1 break-all font-mono text-xs sm:text-sm">{autoClaimUrl}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void handleCopyClaimLink();
                          }}
                        >
                          {isClaimLinkCopied ? (
                            <>
                              <Check className="size-4" aria-hidden="true" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="size-4" aria-hidden="true" />
                              Copy link
                            </>
                          )}
                        </Button>
                      </div>
                      {autoClaimInvite.invitedEmail ? (
                        <p className="mt-1 text-muted-foreground">
                          This link is email-bound to {autoClaimInvite.invitedEmail}.
                        </p>
                      ) : null}
                      {emailDelivery?.status === "sent" ? (
                        <div className="mt-2 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                          <p className="text-xs">Invite email sent to {autoClaimInvite.invitedEmail}.</p>
                        </div>
                      ) : emailDelivery?.status === "skipped" ? (
                        <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
                          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <div>
                              <p className="font-medium text-xs">Email not sent automatically</p>
                              <p className="text-xs">{emailDelivery.message ?? "Share the link above manually."}</p>
                            </div>
                          </div>
                        </div>
                      ) : emailDelivery?.status === "failed" ? (
                        <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5">
                          <div className="flex items-start gap-2 text-destructive">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <div>
                              <p className="font-medium text-xs">Email failed to send</p>
                              <p className="text-xs">{emailDelivery.message ?? "Copy the link above and share it manually."}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (!claimInviteId) return;
                                retryEmailSend.mutate({ inviteId: claimInviteId });
                              }}
                              disabled={retryEmailSend.isPending || !claimInviteId}
                            >
                              {retryEmailSend.isPending ? (
                                <>
                                  <Loader className="mr-1 size-4 animate-spin" aria-hidden="true" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-1 size-4" aria-hidden="true" />
                                  Resend email
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" onClick={handleAddAnother}>
                  Add another member
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/members">Back to members</Link>
                </Button>
              </div>
            </section>
          ) : addMode === "single" ? (
            <form onSubmit={handleSubmit} action="#" className="rounded-3xl border bg-card p-6 shadow-sm sm:p-7">
              <div className="mb-6 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <UserRoundPlus className="mt-0.5 size-4" aria-hidden="true" />
                  <p>
                    This creates an unclaimed profile only. The person does not need to be present now and
                    can claim the account later.
                  </p>
                </div>
              </div>

              {formError ? (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="size-5" aria-hidden="true" />
                  <AlertTitle>Unable to create member</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              {managementContext.isLoading ? (
                <Alert className="mb-6">
                  <AlertCircle className="size-5" aria-hidden="true" />
                  <AlertTitle>Loading family context</AlertTitle>
                  <AlertDescription>
                    We&apos;re checking which family you can add this member to.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Full name
                  </label>
                  <Input
                    id="name"
                    placeholder="For example: Evelyn Shittabey"
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                    required
                    disabled={
                      isSaving ||
                      managementContext.isLoading ||
                      !selectedFamilyId ||
                      !canManageMembers
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="nickname" className="text-sm font-medium">
                    Nickname (optional)
                  </label>
                  <Input
                    id="nickname"
                    placeholder="For example: Nana"
                    value={memberNickname}
                    onChange={(event) => setMemberNickname(event.target.value)}
                    disabled={
                      isSaving ||
                      managementContext.isLoading ||
                      !selectedFamilyId ||
                      !canManageMembers
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email (optional)
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@family.com"
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    disabled={
                      isSaving ||
                      managementContext.isLoading ||
                      !selectedFamilyId ||
                      !canManageMembers
                    }
                  />
                  {hasEmail ? (
                    <p className="text-xs text-muted-foreground">
                      A claim invite link will be created automatically and bound to this email.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <p className="text-sm font-medium">Profile photo (optional)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="hidden"
                    onChange={(event) => {
                      handleAvatarSelected(event.currentTarget.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                  <div className="flex items-center gap-3 rounded-2xl border bg-muted/20 p-3">
                    <div className="relative shrink-0">
                      <Avatar className="size-12 border">
                        <AvatarImage
                          src={selectedAvatarPreviewUrl ?? undefined}
                          alt={memberName || "Profile photo"}
                        />
                        <AvatarFallback>
                          <User className="size-5 text-muted-foreground" aria-hidden="true" />
                        </AvatarFallback>
                      </Avatar>
                      {isPreviewConverting ? (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background">
                          <Loader className="size-4 animate-spin text-foreground" aria-hidden="true" />
                          <span className="sr-only">Converting image preview</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSaving || managementContext.isLoading || !selectedFamilyId || !canManageMembers}
                      >
                        <Camera className="size-4" aria-hidden="true" />
                        {selectedAvatarFile ? "Change photo" : "Choose photo"}
                      </Button>
                      {selectedAvatarFile ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleRemoveAvatar}
                          disabled={isSaving}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {selectedAvatarFile ? (
                    <p className="text-xs text-muted-foreground">Selected: {selectedAvatarFile.name}</p>
                  ) : null}
                  {isSaving && uploadProgress > 0 ? (
                    <div className="space-y-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Uploading photo: {uploadProgress}%</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="flex items-start gap-2 rounded-xl border bg-muted/20 p-3 text-sm" htmlFor="generate-claim-invite">
                    <input
                      id="generate-claim-invite"
                      type="checkbox"
                      className="mt-0.5"
                      checked={shouldGenerateInviteNow}
                      onChange={(event) => setShouldGenerateInvite(event.target.checked)}
                      disabled={
                        isSaving ||
                        managementContext.isLoading ||
                        !selectedFamilyId ||
                        !canManageMembers ||
                        hasEmail
                      }
                    />
                    <span className="space-y-1">
                      <span className="block font-medium">Generate invite link now</span>
                      <span className="block text-xs text-muted-foreground">
                        Create a claim link immediately after adding this member.
                        {hasEmail ? " Required because an email is provided." : ""}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    isSaving ||
                    managementContext.isLoading ||
                    !selectedFamilyId ||
                    !canManageMembers
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader className="size-4 animate-spin" aria-hidden="true" />
                      {uploadProgress > 0 ? "Uploading..." : "Creating..."}
                    </>
                  ) : (
                    "Create member"
                  )}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/members">Back to members</Link>
                </Button>
              </div>

            </form>
          ) : (
            <form onSubmit={handleBulkSubmit} action="#" className="rounded-3xl border bg-card p-6 shadow-sm sm:p-7">
              <div className="mb-6 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <UserRoundPlus className="mt-0.5 size-4" aria-hidden="true" />
                  <p>
                    Add multiple unclaimed profiles in one pass using names only. Invites are not created in bulk mode.
                  </p>
                </div>
              </div>

              {bulkError ? (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="size-5" aria-hidden="true" />
                  <AlertTitle>Unable to finish bulk creation</AlertTitle>
                  <AlertDescription>{bulkError}</AlertDescription>
                </Alert>
              ) : null}

              {managementContext.isLoading ? (
                <Alert className="mb-6">
                  <AlertCircle className="size-5" aria-hidden="true" />
                  <AlertTitle>Loading family context</AlertTitle>
                  <AlertDescription>
                    We&apos;re checking which family you can add these members to.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-3">
                {bulkRows.map((row, index) => (
                  <div key={row.id} className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={row.name}
                        onChange={(event) => updateBulkRow(row.id, event.target.value)}
                        placeholder={`Member name ${index + 1}`}
                        disabled={isBulkSaving || isContextBlocked}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => handleRemoveBulkRow(row.id)}
                        disabled={isBulkSaving || isContextBlocked || bulkRows.length <= 1}
                        aria-label={`Remove member row ${index + 1}`}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                    {row.error ? <p className="text-destructive text-xs">{row.error}</p> : null}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddBulkRow}
                  disabled={isBulkSaving || isContextBlocked}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add another row
                </Button>
              </div>

              {bulkProgress ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Creating members... {bulkProgress.completed}/{bulkProgress.total}
                </p>
              ) : null}

              {bulkResults.length > 0 ? (
                <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
                  <p className="font-medium text-sm">
                    Created {bulkResults.filter((result) => result.status === "created").length} of {bulkResults.length} members.
                  </p>
                  {bulkResults.some((result) => result.status === "failed") ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {bulkResults
                        .filter((result) => result.status === "failed")
                        .map((result) => (
                          <li key={result.id}>
                            {result.name}: {result.message ?? "Unable to create this member."}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={isBulkSaving || isContextBlocked}
                >
                  {isBulkSaving ? (
                    <>
                      <Loader className="size-4 animate-spin" aria-hidden="true" />
                      Creating...
                    </>
                  ) : (
                    "Create members"
                  )}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/members">Back to members</Link>
                </Button>
              </div>
            </form>
          )}
        </section>
      )}
    </section>
  );
}
