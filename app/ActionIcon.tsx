const paths = {
  plus: "M12 5v14M5 12h14",
  edit: "m15 4 5 5M4 20l4-1L21 6l-5-5L3 14z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  save: "M19 21H5a2 2 0 0 1-2-2V3h15l3 3v13a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  open: "M14 3h7v7M21 3l-10 10M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
  back: "M19 12H5M11 6l-6 6 6 6",
  next: "M5 12h14M13 6l6 6-6 6",
  refresh: "M21 3v6h-6M20 9a9 9 0 1 0 0 7",
  search: "M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  filter: "M3 4h18l-7 8v7l-4 2v-9z",
  send: "m22 2-7 20-4-9L2 9zM22 2 11 13",
  image: "M3 3h18v18H3zM3 17l5-6 4 4 4-6 5 8M8 7h.01",
  video: "M3 5h13v14H3zM16 10l5-3v10l-5-3",
  text: "M4 5h16M12 5v15M8 20h8",
  stories: "M16 3a9 9 0 1 0 5 10M19 2v6M16 5h6M8 10h7M8 14h5",
  lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4M12 14v3",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2",
  logout: "M10 4H4v16h6M9 12h12M17 8l4 4-4 4",
  check: "m5 12 4 4L20 5",
  close: "m6 6 12 12M18 6 6 18",
  upload: "M12 16V3M7 8l5-5 5 5M4 16v5h16v-5",
  download: "M12 3v13M7 11l5 5 5-5M4 17v4h16v-4",
  copy: "M8 8h13v13H8zM16 8V3H3v13h5",
  stats: "M4 21V3M4 21h17M8 17v-5M13 17V8M18 17V4",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  phone: "M7 3 3 5c0 8 8 16 16 16l2-4-5-3-2 2a13 13 0 0 1-6-6l2-2z",
  help: "M9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3M12 18h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  flag: "M5 21V3M5 4h14l-2 4 2 4H5",
  share: "M12 16V3M7 8l5-5 5 5M5 13H3v8h18v-8h-2",
  heart: "M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-6 6 8 16 8 16S26 11 20 5",
  chat: "M3 4h18v13H9l-6 4zM7 8h10M7 12h6",
  settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
} as const;

export type ActionIconName = keyof typeof paths | "whatsapp" | "telegram";

export function ActionIcon({ name }: { name: ActionIconName }) {
  if (name === "whatsapp") return <svg className="action-icon" viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 3.25a12.7 12.7 0 0 0-10.92 19.2L3.7 28.75l6.5-1.7A12.73 12.73 0 1 0 16 3.25Zm0 2.45a10.27 10.27 0 1 1-5.12 19.17l-.5-.3-3.86 1.01 1.03-3.75-.33-.53A10.27 10.27 0 0 1 16 5.7Zm-4.21 4.87c-.36 0-.73.1-1 .43-.28.34-1.08 1.05-1.08 2.56 0 1.5 1.1 2.95 1.25 3.16.15.2 2.14 3.43 5.2 4.81 2.56 1.16 3.08.93 3.64.87.56-.05 1.8-.74 2.05-1.45.25-.72.25-1.33.18-1.46-.08-.13-.28-.2-.59-.36-.3-.15-1.8-.89-2.08-.99-.28-.1-.49-.15-.7.15-.2.3-.8.99-.98 1.2-.18.2-.36.23-.67.08-.3-.16-1.3-.48-2.47-1.54-.92-.83-1.54-1.85-1.72-2.16-.18-.3-.02-.47.13-.62.14-.14.31-.36.46-.54.15-.18.2-.3.3-.51.1-.2.05-.38-.02-.54-.08-.15-.7-1.7-.96-2.32-.25-.61-.5-.53-.7-.54h-.58Z" /></svg>;
  if (name === "telegram") return <svg className="action-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="m21.15 3.37-18.3 7.06c-1.25.5-1.24 1.2-.23 1.5l4.7 1.47 1.82 5.57c.22.61.11.85.75.85.49 0 .7-.22.98-.48l2.28-2.22 4.74 3.5c.88.49 1.5.24 1.72-.82l3.12-14.68c.32-1.3-.5-1.89-1.58-1.4Zm-11.97 9.55 10.88-6.87c.55-.33 1.05-.15.64.21l-9.33 8.42-.36 3.82-1.93-5.58Z" /></svg>;
  return <svg className="action-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
