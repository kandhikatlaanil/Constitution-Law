import { useCallback, useEffect, useState } from "react";
import {
  getBookmarkIds,
  addBookmark,
  removeBookmark,
  addRecent,
  UserItem,
} from "@/src/api/content";

export function useUserData() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const res = await getBookmarkIds();
      setIds(new Set(res.ids));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isBookmarked = useCallback((refId: string) => ids.has(refId), [ids]);

  const toggleBookmark = useCallback(
    async (item: UserItem) => {
      const has = ids.has(item.ref_id);
      // optimistic
      setIds((prev) => {
        const next = new Set(prev);
        if (has) next.delete(item.ref_id);
        else next.add(item.ref_id);
        return next;
      });
      try {
        if (has) await removeBookmark(item.ref_id);
        else await addBookmark(item);
      } catch {
        refresh();
      }
    },
    [ids, refresh],
  );

  const recordRecent = useCallback((item: UserItem) => {
    addRecent(item).catch(() => {});
  }, []);

  return { ids, isBookmarked, toggleBookmark, recordRecent, refresh };
}
