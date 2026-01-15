import {
  LayoutDashboard,
  ListChecks,
  Settings2,
  Sparkles,
  Table2,
  UploadCloud,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Tareas",
    href: "/tasks",
    icon: ListChecks,
  },
  {
    title: "Nueva tarea",
    href: "/tasks/new",
    icon: Sparkles,
    badge: "Live",
  },
  {
    title: "Data explorer",
    href: "/leads",
    icon: Table2,
  },
  {
    title: "Exportaciones",
    href: "/exports",
    icon: UploadCloud,
  },
  {
    title: "Ajustes",
    href: "/settings",
    icon: Settings2,
  },
];
