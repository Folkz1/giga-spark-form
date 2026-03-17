import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode, TextareaHTMLAttributes, ChangeEvent, KeyboardEvent } from "react";

interface Member {
  id: string;
  username: string;
  email?: string;
  profilePicture?: string;
}

const FALLBACK_MEMBERS: Member[] = [
  { id: "112072046", username: "Railson" },
  { id: "111933744", username: "Vanessa" },
  { id: "111933196", username: "Talita" },
  { id: "106108085", username: "Alex" },
  { id: "254549717", username: "Alan" },
];

interface MentionTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  members?: Member[];
  hint?: ReactNode;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

const getCaretCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const span = document.createElement("span");

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";

  const mirroredProperties = [
    "boxSizing",
    "width",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "tabSize",
  ] as const;

  mirroredProperties.forEach((property) => {
    mirror.style[property] = computed[property];
  });

  mirror.textContent = textarea.value.slice(0, position);
  if (textarea.value.slice(0, position).endsWith("\n")) {
    mirror.textContent += "\u200b";
  }

  span.textContent = textarea.value.slice(position) || "\u200b";
  mirror.appendChild(span);
  document.body.appendChild(mirror);

  const mirrorRect = mirror.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();

  document.body.removeChild(mirror);

  return {
    top: spanRect.top - mirrorRect.top,
    left: spanRect.left - mirrorRect.left,
    lineHeight: Number.parseFloat(computed.lineHeight) || Number.parseFloat(computed.fontSize) * 1.4 || 20,
  };
};

export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ value, onChange, members, hint, className, onKeyDown, onClick, onSelect, ...props }, forwardedRef) => {
    const resolvedMembers = members && members.length > 0 ? members : FALLBACK_MEMBERS;

    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionFilter, setMentionFilter] = useState("");
    const [mentionCursorPos, setMentionCursorPos] = useState(0);
    const [mentionStartIdx, setMentionStartIdx] = useState(0);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const filtered = resolvedMembers.filter((member) => {
      const filter = mentionFilter.trim().toLowerCase();
      if (!filter) return true;
      return (
        member.username.toLowerCase().includes(filter) ||
        member.email?.toLowerCase().includes(filter)
      );
    });

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;

        if (typeof forwardedRef === "function") {
          forwardedRef(node);
          return;
        }

        if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    const updateDropdownPosition = useCallback(
      (textarea: HTMLTextAreaElement, cursorPos: number) => {
        const textareaRect = textarea.getBoundingClientRect();
        const caret = getCaretCoordinates(textarea, cursorPos);
        const width = Math.min(280, window.innerWidth - 16);
        let left = textareaRect.left + caret.left - textarea.scrollLeft;
        let top = textareaRect.top + caret.top - textarea.scrollTop + caret.lineHeight + 8;

        if (left + width > window.innerWidth - 8) {
          left = window.innerWidth - width - 8;
        }

        if (top + 180 > window.innerHeight - 8) {
          top = textareaRect.top + caret.top - textarea.scrollTop - 180 - 8;
        }

        setDropdownPosition({
          top: Math.max(8, top),
          left: Math.max(8, left),
          width,
        });
      },
      [],
    );

    const closeMentions = useCallback(() => {
      setMentionOpen(false);
      setMentionFilter("");
      setDropdownPosition(null);
    }, []);

    const syncMentionState = useCallback(
      (nextValue: string, cursorPos: number, textarea?: HTMLTextAreaElement | null) => {
        const textBeforeCursor = nextValue.slice(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/(^|\s)@([^\s@]*)$/);

        if (!mentionMatch) {
          closeMentions();
          return;
        }

        const filter = mentionMatch[2] ?? "";
        const startIdx = cursorPos - filter.length - 1;

        setMentionOpen(true);
        setMentionFilter(filter);
        setMentionStartIdx(startIdx);
        setMentionCursorPos(cursorPos);

        if (textarea) {
          updateDropdownPosition(textarea, cursorPos);
        }
      },
      [closeMentions, updateDropdownPosition],
    );

    useEffect(() => {
      setSelectedIdx(0);
    }, [mentionFilter]);

    useEffect(() => {
      if (!mentionOpen) return;

      const handleOutsideClick = (event: MouseEvent) => {
        const target = event.target as Node;

        if (
          dropdownRef.current?.contains(target) ||
          textareaRef.current?.contains(target)
        ) {
          return;
        }

        closeMentions();
      };

      const handleReposition = () => {
        if (textareaRef.current) {
          updateDropdownPosition(textareaRef.current, mentionCursorPos);
        }
      };

      document.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("resize", handleReposition);
      window.addEventListener("scroll", handleReposition, true);

      return () => {
        document.removeEventListener("mousedown", handleOutsideClick);
        window.removeEventListener("resize", handleReposition);
        window.removeEventListener("scroll", handleReposition, true);
      };
    }, [closeMentions, mentionCursorPos, mentionOpen, updateDropdownPosition]);

    const insertMention = useCallback(
      (member: Member) => {
        const before = value.slice(0, mentionStartIdx);
        const after = value.slice(mentionCursorPos);
        const mentionValue = `@[${member.username}](${member.id})`;
        const nextValue = `${before}${mentionValue} ${after}`;

        onChange(nextValue);
        closeMentions();

        requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          if (!textarea) return;

          const nextCursorPos = mentionStartIdx + mentionValue.length + 1;
          textarea.focus();
          textarea.setSelectionRange(nextCursorPos, nextCursorPos);
        });
      },
      [closeMentions, mentionCursorPos, mentionStartIdx, onChange, value],
    );

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      const cursorPos = event.target.selectionStart ?? nextValue.length;

      console.log("onChange", nextValue, "mentionOpen:", mentionOpen);
      onChange(nextValue);
      syncMentionState(nextValue, cursorPos, event.target);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || !mentionOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeMentions();
        return;
      }

      if (!filtered.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIdx((prev) => (prev + 1) % filtered.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(filtered[selectedIdx]);
      }
    };

    const handleCaretInteraction = (textarea: HTMLTextAreaElement) => {
      const cursorPos = textarea.selectionStart ?? value.length;
      syncMentionState(textarea.value, cursorPos, textarea);
    };

    return (
      <div className="relative">
        <textarea
          {...props}
          ref={setRefs}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={className}
          onClick={(event) => {
            onClick?.(event);
            handleCaretInteraction(event.currentTarget);
          }}
          onSelect={(event) => {
            onSelect?.(event);
            handleCaretInteraction(event.currentTarget);
          }}
        />
        {hint}

        {mentionOpen && dropdownPosition && typeof document !== "undefined"
          ? createPortal(
              <div className="fixed inset-0 z-[120] pointer-events-none">
                <div
                  ref={dropdownRef}
                  className="pointer-events-auto absolute overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-md"
                  style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <div className="max-h-44 overflow-y-auto p-1">
                    {filtered.length > 0 ? (
                      filtered.map((member, idx) => (
                        <button
                          key={member.id}
                          type="button"
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            idx === selectedIdx
                              ? "bg-accent text-accent-foreground"
                              : "text-popover-foreground/80 hover:bg-accent/60"
                          }`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            insertMention(member);
                          }}
                          onMouseEnter={() => setSelectedIdx(idx)}
                        >
                          {member.profilePicture ? (
                            <img
                              src={member.profilePicture}
                              className="h-6 w-6 shrink-0 rounded-full"
                              alt={member.username}
                            />
                          ) : (
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                              {member.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{member.username}</span>
                          {member.email ? (
                            <span className="truncate text-xs text-muted-foreground">{member.email}</span>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum membro encontrado</div>
                    )}
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  },
);

MentionTextarea.displayName = "MentionTextarea";
