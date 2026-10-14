"use client";
import { useEffect } from "react";

export function ResumeAdminSession() {
  useEffect(() => { window.location.replace("/admin"); }, []);
  return null;
}
