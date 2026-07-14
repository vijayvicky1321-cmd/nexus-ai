"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { MODULES, MODULE_SECTIONS } from "@/lib/modules";

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 pt-3 pb-2">
        <Link href="/chat" className="flex items-center gap-2.5 px-1">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            N
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-primary group-data-[collapsible=icon]:hidden">
            Nexus AI
          </span>
        </Link>
        <div className="group-data-[collapsible=icon]:hidden">
          <OrganizationSwitcher
            hidePersonal={false}
            appearance={{ elements: { rootBox: "w-full" } }}
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive("/admin")}
                  tooltip="Dashboard"
                  className={cn(
                    "relative",
                    isActive("/admin") &&
                      "before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                  )}
                  render={
                    <Link href="/admin">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {MODULE_SECTIONS.map((section) => (
          <SidebarGroup key={section}>
            <SidebarGroupLabel className="text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
              {section}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MODULES.filter((mod) => mod.section === section).map((mod) => {
                  const href = `/${mod.slug}`;
                  const active = isActive(href);
                  return (
                    <SidebarMenuItem key={mod.slug}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={mod.label}
                        className={cn(
                          "relative",
                          active &&
                            "before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                        )}
                        render={
                          <Link href={href}>
                            <mod.icon className={mod.iconColor} />
                            <span>{mod.label}</span>
                          </Link>
                        }
                      />
                      {!mod.implemented && (
                        <SidebarMenuBadge className="rounded-full border border-border/80 bg-transparent text-[10px] font-medium text-muted-foreground">
                          Soon
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 px-1">
          <UserButton />
          <span className="text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
            Account
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
