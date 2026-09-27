import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"

export function ThemeMenu() {
  const { theme, setTheme } = useTheme()
  const Icon =
    theme === "dark" ? MoonIcon : theme === "light" ? SunIcon : MonitorIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton tooltip="Tema">
          <Icon />
          <span>Tema</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <MonitorIcon />
            Sistema
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <SunIcon />
            Claro
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <MoonIcon />
            Escuro
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
