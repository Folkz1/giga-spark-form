import { useState, useRef, useEffect, useCallback } from "react";

interface Member {
  id: string;
  username: string;
  email?: string;
  profilePicture?: string;
}

// Hardcoded fallback members
const FALLBACK_MEMBERS: Member[] = [
  { id: "112072046", username: "Railson" },
  { id: "111933744", username: "Vanessa" },
  { id: "111933196", username: "Talita" },
  { id: "106108085", username: "Alex" },
  { id: "254549717", username: "Alan" },
];

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  members?: Member[];
  placeholder?: string;
  rows?: number;
  className?: string;
  /** Extra content rendered below the textarea (e.g. hint text) */
  hint?: React.ReactNode;
}

export function MentionTextarea({
  value,
  onChange,
  members,
  placeholder,
  rows = 3,
  className = "",
  hint,
}: MentionTextareaProps) {
  const resolvedMembers = members && members.length > 0 ? members : FALLBACK_MEMBERS;

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [mentionStartIdx, setMentionStartIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = resolvedMembers.filter((m) =>
    m.username.toLowerCase().includes(mentionFilter.toLowerCase()),
  );

  // Reset selected when filter changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [mentionFilter]);

  const insertMention = useCallback(
    (member: Member) => {
      const before = value.slice(0, mentionStartIdx);
      const after = value.slice(mentionCursorPos);
      const newValue = `${before}@${member.username} ${after}`;
      onChange(newValue);
      setMentionOpen(false);
      setMentionFilter("");
      // Focus back and set cursor
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) {
          const pos = mentionStartIdx + member.username.length + 2; // @Name + space
          ta.focus();
          ta.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [value, onChange, mentionStartIdx, mentionCursorPos],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    onChange(newValue);

    // Check if we should open mention dropdown
    // Look backwards from cursor for an @ that starts a mention
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtIdx + 1);
      // Only open if no space in the partial text (user is still typing the name)
      if (!/\s/.test(textAfterAt) && (lastAtIdx === 0 || /\s/.test(newValue[lastAtIdx - 1]))) {
        setMentionOpen(true);
        setMentionFilter(textAfterAt);
        setMentionStartIdx(lastAtIdx);
        setMentionCursorPos(cursorPos);
        return;
      }
    }
    setMentionOpen(false);
    setMentionFilter("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionOpen || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filtered[selectedIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!mentionOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mentionOpen]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {hint}

      {/* Mention dropdown */}
      {mentionOpen && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-1 w-full max-w-[280px] z-[120] rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl shadow-black/50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1 max-h-44 overflow-y-auto">
            {filtered.map((member, idx) => (
              <button
                key={member.id}
                type="button"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  idx === selectedIdx
                    ? "bg-purple-500/20 text-white"
                    : "text-white/80 hover:bg-white/5"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertMention(member);
                }}
                onMouseEnter={() => setSelectedIdx(idx)}
              >
                {member.profilePicture ? (
                  <img
                    src={member.profilePicture}
                    className="w-6 h-6 rounded-full shrink-0"
                    alt={member.username}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs text-purple-300 font-bold shrink-0">
                    {member.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="font-medium">{member.username}</span>
                {member.email && (
                  <span className="text-white/30 text-xs truncate">{member.email}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
