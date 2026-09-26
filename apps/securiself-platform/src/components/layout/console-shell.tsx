import { ConsoleSidebar } from "./console-sidebar";
import { ConsoleTopbar } from "./console-topbar";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full">
      {/* Bypasses the sidebar and account menu for keyboard users (Cohort A, A1). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-[3px] focus:ring-ring"
      >
        Skip to main content
      </a>
      <ConsoleSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleTopbar />
        {/* No `overflow-y-auto`: it makes `main` a scroll container that never
            actually scrolls (the window does), which silently disables
            `position: sticky` for everything inside it — including the
            Developer Docs area and section navigation. */}
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
