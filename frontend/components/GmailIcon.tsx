'use client'
import React from "react";
import Image from "next/image";

export function GmailIcon({ size = 16 }: { size?: number }) {
  return (
    <Image
      src="/gmail-icon.svg"
      alt="Gmail"
      width={size}
      height={size}
      priority={false}
    />
  );
}
