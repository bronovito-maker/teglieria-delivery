"use client";

import { Toaster } from "sonner";

export default function ClientToaster() {
  return (
    <Toaster
      position="bottom-center"
      richColors
      closeButton
      duration={2600}
      toastOptions={{
        className: "!mb-20 sm:!mb-6",
      }}
    />
  );
}
