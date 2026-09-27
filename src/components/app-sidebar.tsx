import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  Building2Icon,
  HouseIcon,
  LandmarkIcon,
  PieChartIcon,
  SettingsIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"
import { Link, useLocation } from "react-router"

import { AppCredit } from "@/components/app-credit"
import { BrandMark } from "@/components/brand-mark"
import { ThemeMenu } from "@/components/theme-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { APP_NAME } from "@/lib/brand"

const GROUPS = [
  {
    label: "Visão",
    items: [
      { to: "/", label: "Início", icon: HouseIcon },
      { to: "/relatorios", label: "Relatórios", icon: PieChartIcon },
    ],
  },
  {
    label: "Lançamentos",
    items: [
      { to: "/pagar", label: "A pagar", icon: ArrowUpRightIcon },
      { to: "/receber", label: "A receber", icon: ArrowDownLeftIcon },
      { to: "/investimentos", label: "Investimentos", icon: TrendingUpIcon },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { to: "/fornecedores", label: "Fornecedores", icon: Building2Icon },
      { to: "/clientes", label: "Clientes", icon: UsersIcon },
      { to: "/bancos", label: "Bancos", icon: LandmarkIcon },
    ],
  },
] as const

function isActive(pathname: string, to: string): boolean {
  if (to === "/") {
    return pathname === "/"
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={APP_NAME}
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Link to="/" aria-label={APP_NAME}>
                <BrandMark />
                <span className="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{APP_NAME}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Só neste navegador
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(location.pathname, item.to)}
                        tooltip={item.label}
                      >
                        <Link to={item.to}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 group-data-[collapsible=icon]:hidden">
          <AppCredit />
        </div>
        <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeMenu />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/configuracoes"}
              tooltip="Configurações"
            >
              <Link to="/configuracoes">
                <SettingsIcon />
                <span>Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
