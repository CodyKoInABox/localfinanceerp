import * as React from "react"
import { SearchIcon } from "lucide-react"
import { Outlet } from "react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const isApple =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)

export function AppShell() {
  const [commandOpen, setCommandOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <Button
            variant="outline"
            className="min-w-0 flex-1 justify-start text-muted-foreground sm:max-w-xl"
            onClick={() => setCommandOpen(true)}
          >
            <SearchIcon data-icon="inline-start" />
            <span className="truncate">Buscar</span>
            <Kbd className="ml-auto hidden sm:inline-flex">
              {isApple ? "⌘K" : "Ctrl K"}
            </Kbd>
          </Button>
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </SidebarProvider>
  )
}
