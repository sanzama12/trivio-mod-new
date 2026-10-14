"use client";

/**
 * Trạng thái phía client (đã lưu, nguyện vọng, so sánh, hồ sơ điểm, kết quả trắc nghiệm).
 *
 * - Khách: lưu trong localStorage của trình duyệt.
 * - Đã đăng nhập: sau khi đăng nhập, dữ liệu trên máy được GỘP vào tài khoản (/api/account/data/merge),
 *   mọi thay đổi sau đó tự đồng bộ lên server (debounce) → dùng được trên nhiều thiết bị.
 * - Đăng xuất / hết phiên: xoá bản sao dữ liệu tài khoản khỏi trình duyệt (giữ danh sách so sánh).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Goal, StoredMbti, StoredProfile, StoredQuiz, StoredWorkStyle, UserData, WishlistItem } from "@/domain/types";
import { sanitizeMbti, sanitizeWorkStyle } from "@/domain/work-style";
import { track } from "@/lib/track";
import { useToast } from "@/components/ui/toast";

export type { Goal, StoredMbti, StoredProfile, StoredQuiz, StoredWorkStyle, WishlistItem } from "@/domain/types";

export const MAX_COMPARE = 3;
const STORAGE_KEY = "trovio:v1";
const INTENT_KEY = "trovio:intent";

/** Người dùng đang đăng nhập (tối thiểu cho client). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

/** Thao tác khách định làm trước khi được mời đăng nhập — tự thực hiện lại sau khi đăng nhập xong. */
export type PendingIntent = { kind: "wishlist"; id: string } | { kind: "save"; id: string } | { kind: "quiz" };

export type SyncStatus = "guest" | "syncing" | "synced" | "error";

interface State {
  saved: string[];
  wishlist: WishlistItem[];
  compare: string[];
  profile: StoredProfile | null;
  quiz: StoredQuiz | null;
  quizDraft: Record<number, number>;
  /** id các mốc tuyển sinh đã bật "Nhắc tôi". */
  reminders: string[];
  /** Mục tiêu đặt qua hội thoại. */
  goal: Goal | null;
  /** Mini-test phong cách làm việc (tham khảo, không tính điểm). */
  workStyle: StoredWorkStyle | null;
  /** Mã MBTI tự nhập (tham khảo, không tính điểm). */
  mbti: StoredMbti | null;
  /** id tài khoản sở hữu dữ liệu đang lưu trên máy (null = dữ liệu của khách). */
  owner: string | null;
}

const initialState: State = { saved: [], wishlist: [], compare: [], profile: null, quiz: null, quizDraft: {}, reminders: [], goal: null, workStyle: null, mbti: null, owner: null };

interface Store extends Omit<State, "owner"> {
  hydrated: boolean;
  user: SessionUser | null;
  sync: SyncStatus;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => boolean;
  inWishlist: (id: string) => boolean;
  addWishlist: (id: string) => void;
  removeWishlist: (id: string) => void;
  moveWishlist: (id: string, dir: -1 | 1) => void;
  /** Đặt lại thứ tự nguyện vọng theo danh sách id (id thiếu giữ nguyên ở cuối). */
  reorderWishlist: (ids: string[]) => void;
  hasReminder: (id: string) => boolean;
  toggleReminder: (id: string) => boolean;
  setWishlistNote: (id: string, note: string) => void;
  inCompare: (id: string) => boolean;
  toggleCompare: (id: string) => "added" | "removed" | "full";
  clearCompare: () => void;
  setProfile: (profile: StoredProfile | null) => void;
  setQuiz: (quiz: StoredQuiz | null) => void;
  setQuizDraft: (draft: Record<number, number>) => void;
  setGoal: (goal: Goal | null) => void;
  setWorkStyle: (workStyle: StoredWorkStyle | null) => void;
  setMbti: (mbti: StoredMbti | null) => void;
  resetAll: () => void;
  setPendingIntent: (intent: PendingIntent | null) => void;
}

const StoreContext = createContext<Store | null>(null);

function save(state: State) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage không khả dụng: giữ trong bộ nhớ */
  }
}

function load(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<State>;
    const s = { ...initialState, ...parsed };
    // Bảo vệ khi dữ liệu cũ/hỏng trong localStorage.
    return {
      ...s,
      saved: Array.isArray(s.saved) ? s.saved : [],
      wishlist: Array.isArray(s.wishlist) ? s.wishlist : [],
      compare: Array.isArray(s.compare) ? s.compare : [],
      reminders: Array.isArray(s.reminders) ? s.reminders : [],
      goal: s.goal && typeof s.goal === "object" ? s.goal : null,
      quizDraft: s.quizDraft && typeof s.quizDraft === "object" ? s.quizDraft : {},
      workStyle: sanitizeWorkStyle(s.workStyle),
      mbti: sanitizeMbti(s.mbti),
    };
  } catch {
    return initialState;
  }
}

const syncedPart = (s: State) => ({ saved: s.saved, wishlist: s.wishlist, profile: s.profile, quiz: s.quiz, reminders: s.reminders, goal: s.goal, workStyle: s.workStyle, mbti: s.mbti });
const hasGuestData = (s: State) =>
  s.saved.length > 0 || s.wishlist.length > 0 || !!s.profile || !!s.quiz || s.reminders.length > 0 || !!s.goal || !!s.workStyle || !!s.mbti;

function takeIntent(): PendingIntent | null {
  try {
    const raw = window.sessionStorage.getItem(INTENT_KEY);
    window.sessionStorage.removeItem(INTENT_KEY);
    return raw ? (JSON.parse(raw) as PendingIntent) : null;
  } catch {
    return null;
  }
}

export function TrovioStoreProvider({ children, user }: { children: ReactNode; user: SessionUser | null }) {
  const toast = useToast();
  const [state, setState] = useState<State>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [sync, setSync] = useState<SyncStatus>(user ? "syncing" : "guest");
  const hydratedRef = useRef(false);
  const syncedFor = useRef<string | null>(null);
  const inflight = useRef<string | null>(null);
  const pendingPush = useRef<string | null>(null);

  useEffect(() => {
    setState(load());
    hydratedRef.current = true;
    setHydrated(true);
    track("visit");
  }, []);

  // Ghi đồng bộ ngay khi cập nhật để không mất dữ liệu nếu trang điều hướng/tải lại ngay sau đó.
  const update = useCallback(
    (fn: (s: State) => State) =>
      setState((s) => {
        // Nếu người dùng thao tác trước khi kịp đọc storage, gộp với dữ liệu đã lưu để không ghi đè.
        const next = fn(hydratedRef.current ? s : load());
        save(next);
        return next;
      }),
    [],
  );

  const applyIntent = useCallback(
    (intent: PendingIntent | null) => {
      if (!intent) return;
      if (intent.kind === "wishlist") {
        update((s) =>
          s.wishlist.some((w) => w.id === intent.id)
            ? s
            : { ...s, wishlist: [...s.wishlist, { id: intent.id, note: "" }], saved: s.saved.includes(intent.id) ? s.saved : [intent.id, ...s.saved] },
        );
        toast("Đã thêm vào nguyện vọng dự kiến", "success");
        track("wishlist_added");
      } else if (intent.kind === "save") {
        update((s) => (s.saved.includes(intent.id) ? s : { ...s, saved: [intent.id, ...s.saved] }));
        toast("Đã lưu chương trình vào tài khoản", "success");
        track("program_saved");
      } else if (intent.kind === "quiz") {
        update((s) => (s.quiz ? { ...s, quiz: { ...s.quiz, savedToProfile: true } } : s));
        toast("Đã lưu kết quả trắc nghiệm vào hồ sơ", "success");
      }
    },
    [toast, update],
  );

  // Đăng nhập → gộp dữ liệu khách vào tài khoản. Đăng xuất/hết phiên → xoá bản sao dữ liệu tài khoản.
  const uid = user?.id ?? null;
  useEffect(() => {
    if (!hydrated) return;
    const local = load();
    if (!uid) {
      syncedFor.current = null;
      inflight.current = null;
      setSync("guest");
      if (local.owner) update((s) => ({ ...s, saved: [], wishlist: [], profile: null, quiz: null, quizDraft: {}, reminders: [], goal: null, workStyle: null, mbti: null, owner: null }));
      return;
    }
    if (syncedFor.current === uid || inflight.current === uid) return;
    inflight.current = uid;
    setSync("syncing");
    // Dữ liệu của tài khoản khác còn sót trên máy thì không gộp.
    const mine = local.owner === null || local.owner === uid;
    const wasGuest = local.owner === null && hasGuestData(local);
    fetch("/api/account/data/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mine ? syncedPart(local) : {}),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(({ data, added }: { data: UserData; added: number }) => {
        if (inflight.current !== uid) return; // đã đăng xuất/đổi tài khoản trong lúc chờ
        inflight.current = null;
        syncedFor.current = uid;
        update((s) => ({
          ...s,
          saved: data.saved,
          wishlist: data.wishlist,
          profile: data.profile,
          quiz: data.quiz,
          reminders: data.reminders ?? [],
          goal: data.goal ?? null,
          workStyle: data.workStyle ?? null,
          mbti: data.mbti ?? null,
          owner: uid,
        }));
        setSync("synced");
        if (wasGuest && added > 0) toast(`Đã đồng bộ ${added} mục từ máy này vào tài khoản`, "success");
        applyIntent(takeIntent());
      })
      .catch(() => {
        if (inflight.current !== uid) return;
        inflight.current = null;
        setSync("error");
      });
  }, [hydrated, uid, update, toast, applyIntent]);

  // Đẩy thay đổi lên server (debounce 600ms); flush khi rời trang.
  useEffect(() => {
    if (!uid || syncedFor.current !== uid || state.owner !== uid) return;
    const body = JSON.stringify(syncedPart(state));
    pendingPush.current = body;
    const t = setTimeout(() => {
      pendingPush.current = null;
      fetch("/api/account/data", { method: "PUT", headers: { "Content-Type": "application/json" }, body })
        .then((r) => setSync(r.ok ? "synced" : "error"))
        .catch(() => setSync("error"));
    }, 600);
    return () => clearTimeout(t);
  }, [uid, state.saved, state.wishlist, state.profile, state.quiz, state.reminders, state.goal, state.workStyle, state.mbti, state.owner]);

  useEffect(() => {
    const flush = () => {
      if (!pendingPush.current) return;
      fetch("/api/account/data", { method: "PUT", headers: { "Content-Type": "application/json" }, body: pendingPush.current, keepalive: true });
      pendingPush.current = null;
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const store = useMemo<Store>(
    () => ({
      saved: state.saved,
      wishlist: state.wishlist,
      compare: state.compare,
      profile: state.profile,
      quiz: state.quiz,
      quizDraft: state.quizDraft,
      reminders: state.reminders,
      goal: state.goal,
      workStyle: state.workStyle,
      mbti: state.mbti,
      hydrated,
      user,
      sync,
      isSaved: (id) => state.saved.includes(id),
      toggleSaved: (id) => {
        const willSave = !state.saved.includes(id);
        update((s) => ({ ...s, saved: willSave ? [id, ...s.saved] : s.saved.filter((x) => x !== id) }));
        if (willSave) track("program_saved");
        return willSave;
      },
      inWishlist: (id) => state.wishlist.some((w) => w.id === id),
      addWishlist: (id) => {
        if (!state.wishlist.some((w) => w.id === id)) track("wishlist_added");
        update((s) =>
          s.wishlist.some((w) => w.id === id)
            ? s
            : { ...s, wishlist: [...s.wishlist, { id, note: "" }], saved: s.saved.includes(id) ? s.saved : [id, ...s.saved] },
        );
      },
      removeWishlist: (id) => update((s) => ({ ...s, wishlist: s.wishlist.filter((w) => w.id !== id) })),
      moveWishlist: (id, dir) =>
        update((s) => {
          const i = s.wishlist.findIndex((w) => w.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= s.wishlist.length) return s;
          const next = [...s.wishlist];
          [next[i], next[j]] = [next[j], next[i]];
          return { ...s, wishlist: next };
        }),
      reorderWishlist: (ids) =>
        update((s) => {
          const byId = new Map(s.wishlist.map((w) => [w.id, w]));
          const ordered = ids.map((id) => byId.get(id)).filter((w): w is WishlistItem => !!w);
          const rest = s.wishlist.filter((w) => !ids.includes(w.id));
          return { ...s, wishlist: [...ordered, ...rest] };
        }),
      hasReminder: (id) => state.reminders.includes(id),
      toggleReminder: (id) => {
        const on = !state.reminders.includes(id);
        update((s) => ({ ...s, reminders: on ? [...s.reminders, id] : s.reminders.filter((x) => x !== id) }));
        return on;
      },
      setWishlistNote: (id, note) => update((s) => ({ ...s, wishlist: s.wishlist.map((w) => (w.id === id ? { ...w, note } : w)) })),
      inCompare: (id) => state.compare.includes(id),
      toggleCompare: (id) => {
        if (state.compare.includes(id)) {
          update((s) => ({ ...s, compare: s.compare.filter((x) => x !== id) }));
          return "removed";
        }
        if (state.compare.length >= MAX_COMPARE) return "full";
        update((s) => ({ ...s, compare: [...s.compare, id] }));
        return "added";
      },
      clearCompare: () => update((s) => ({ ...s, compare: [] })),
      setProfile: (profile) => update((s) => ({ ...s, profile })),
      setQuiz: (quiz) => update((s) => ({ ...s, quiz })),
      setQuizDraft: (quizDraft) => update((s) => ({ ...s, quizDraft })),
      setGoal: (goal) => update((s) => ({ ...s, goal })),
      setWorkStyle: (workStyle) => update((s) => ({ ...s, workStyle })),
      setMbti: (mbti) => update((s) => ({ ...s, mbti })),
      resetAll: () => update(() => initialState),
      setPendingIntent: (intent) => {
        try {
          if (intent) window.sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
          else window.sessionStorage.removeItem(INTENT_KEY);
        } catch {
          /* bỏ qua */
        }
      },
    }),
    [state, hydrated, user, sync, update],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useTrovio(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTrovio phải nằm trong <TrovioStoreProvider>");
  return ctx;
}
