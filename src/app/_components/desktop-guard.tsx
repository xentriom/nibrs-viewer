"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

type DesktopGuardProps = {
  children: ReactNode;
  minWidth?: number;
};

export default function DesktopGuard({ children, minWidth = 1024 }: DesktopGuardProps) {
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();

    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const isBelowRecommended = viewportWidth !== null && viewportWidth < minWidth;
  const isOpen = isBelowRecommended && !dismissed;

  return (
    <>
      {children}
      <Dialog
        open={isOpen}
        disablePointerDismissal
        onOpenChange={(open) => {
          if (!open) setDismissed(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Screen too small</DialogTitle>
            <DialogDescription>
              This app is optimized for larger screens. Some UI may be unusable below {minWidth}px.
            </DialogDescription>
          </DialogHeader>

          {viewportWidth && (
            <div className="text-xs text-muted-foreground">
              Current width: <span className="font-medium text-foreground">{viewportWidth}px</span>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => location.reload()}>
              Reload
            </Button>
            <Button onClick={() => setDismissed(true)}>Continue anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
