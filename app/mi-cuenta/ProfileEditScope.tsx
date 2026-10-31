"use client";
import { useEffect, useState, type ReactNode } from "react";

/** Same-page uploads advance only this editor's own confirmed version.
 * Changes from another editor remain conflicts; they never overwrite a draft. */
export function ProfileEditScope({
  profileId,
  revision,
  children,
}: {
  profileId: string;
  revision: number;
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(revision);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (
        detail?.key === `profile:${profileId}` &&
        Number.isSafeInteger(detail.revision)
      )
        setCurrent((value) =>
          value === detail.previousRevision ? detail.revision : value,
        );
    };
    window.addEventListener("chile3x:own-review-commit", update);
    return () =>
      window.removeEventListener("chile3x:own-review-commit", update);
  }, [profileId]);
  return (
    <div
      data-review-resource={`profile:${profileId}`}
      data-review-revision={current}
      onSubmitCapture={(event) => {
        const form = event.target;
        if (form instanceof HTMLFormElement) {
          const field = form.elements.namedItem("review_revision");
          if (field instanceof HTMLInputElement) field.value = String(current);
        }
      }}
    >
      {children}
    </div>
  );
}
