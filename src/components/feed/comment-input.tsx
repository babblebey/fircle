"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  filterMentionMembers,
  getMentionPopoverAnchor,
  getActiveMentionQuery,
  insertMentionAtQuery,
  reconcileMentionsOnTextChange,
  type MentionDraft,
  type MentionableMember,
} from "~/components/feed/mention-helpers";
import { MentionSuggestionsPopover } from "~/components/feed/mention-suggestions-popover";

type CommentInputProps = {
  user?: {
    name: string;
    avatarUrl?: string;
  };
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitLabel?: string;
  pending?: boolean;
  onCancel?: () => void;
  compact?: boolean;
  autoFocus?: boolean;
  mentionMembers?: MentionableMember[];
  mentions?: MentionDraft[];
  onMentionsChange?: (mentions: MentionDraft[]) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CommentInput({
  user,
  value,
  onChange,
  onSubmit,
  placeholder = "Post your reply",
  submitLabel = "Reply",
  pending = false,
  onCancel,
  compact = false,
  autoFocus = false,
  mentionMembers = [],
  mentions = [],
  onMentionsChange,
}: CommentInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [activeCaret, setActiveCaret] = useState<number | null>(null);
  const hasText = value.trim().length > 0;
  const isExpanded = isFocused || hasText;

  const activeMentionQuery =
    isFocused && activeCaret !== null ? getActiveMentionQuery(value, activeCaret) : null;
  const mentionSuggestions = filterMentionMembers({
    members: mentionMembers,
    activeQuery: activeMentionQuery,
  });
  const showMentionSuggestions = Boolean(activeMentionQuery) && mentionMembers.length > 0;
  const mentionPopoverAnchor = useMemo(() => {
    if (!activeMentionQuery || !textareaRef.current) {
      return null;
    }

    return getMentionPopoverAnchor({
      textarea: textareaRef.current,
      triggerIndex: activeMentionQuery.tokenStart,
    });
  }, [activeMentionQuery]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (!hasText) {
      textarea.style.height = "";
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [hasText, value]);

  useEffect(() => {
    if (!autoFocus || !textareaRef.current) return;
    textareaRef.current.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (activeMentionIndex >= mentionSuggestions.length) {
      setActiveMentionIndex(0);
    }
  }, [activeMentionIndex, mentionSuggestions.length]);

  const applyMentionSelection = (member: MentionableMember) => {
    if (!activeMentionQuery || !textareaRef.current) {
      return;
    }

    const inserted = insertMentionAtQuery({
      text: value,
      mentions,
      activeQuery: activeMentionQuery,
      member,
    });

    onChange(inserted.text);
    onMentionsChange?.(inserted.mentions);
    setActiveMentionIndex(0);
    setActiveCaret(inserted.caret);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(inserted.caret, inserted.caret);
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!hasText || pending) return;
        onSubmit();
      }}
      className={`flex items-start gap-3 rounded-2xl border border-border/80 bg-card/90 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <Avatar className="size-9 shrink-0 border border-border">
        {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
        <AvatarFallback className="text-xs font-semibold text-foreground">
          {user?.name ? getInitials(user.name) : "ME"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value;
              onChange(nextValue);
              onMentionsChange?.(reconcileMentionsOnTextChange(value, nextValue, mentions));
              setActiveCaret(event.target.selectionStart ?? nextValue.length);
            }}
            onFocus={(event) => {
              setIsFocused(true);
              setActiveCaret(event.currentTarget.selectionStart ?? value.length);
            }}
            onBlur={() => {
              setIsFocused(false);
              setActiveCaret(null);
            }}
            onClick={(event) => {
              setActiveCaret(event.currentTarget.selectionStart ?? value.length);
            }}
            onKeyUp={(event) => {
              setActiveCaret(event.currentTarget.selectionStart ?? value.length);
            }}
            onKeyDown={(event) => {
              if (!showMentionSuggestions || mentionSuggestions.length === 0) {
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveMentionIndex((current) =>
                  current + 1 >= mentionSuggestions.length ? 0 : current + 1,
                );
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveMentionIndex((current) =>
                  current - 1 < 0 ? mentionSuggestions.length - 1 : current - 1,
                );
                return;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                const selectedMember = mentionSuggestions[activeMentionIndex];
                if (selectedMember) {
                  applyMentionSelection(selectedMember);
                }
                return;
              }

              if (event.key === "Escape") {
                event.preventDefault();
                setActiveCaret(null);
              }
            }}
            placeholder={placeholder}
            className="mt-0.5 min-h-6 w-full resize-none bg-transparent py-1 leading-5 text-foreground placeholder:text-muted-foreground outline-none"
            disabled={pending}
          />

          {showMentionSuggestions ? (
            <MentionSuggestionsPopover
              members={mentionSuggestions}
              activeIndex={activeMentionIndex}
              onHover={setActiveMentionIndex}
              onSelect={applyMentionSelection}
              anchor={mentionPopoverAnchor}
            />
          ) : null}
        </div>

        {isExpanded ? (
          <div className="mt-2 flex items-center justify-end gap-2">
            {onCancel ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 rounded-full px-4"
                onClick={onCancel}
                disabled={pending}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="submit"
              size="sm"
              className="h-9 rounded-full px-4 font-semibold"
              disabled={!hasText || pending}
            >
              {pending ? "Saving..." : submitLabel}
            </Button>
          </div>
        ) : null}
      </div>

      {!isExpanded ? (
        <Button
          type="submit"
          size="sm"
          className="h-9 shrink-0 rounded-full px-4 font-semibold"
          disabled={!hasText || pending}
        >
          {pending ? "Saving..." : submitLabel}
        </Button>
      ) : null}
    </form>
  );
}
