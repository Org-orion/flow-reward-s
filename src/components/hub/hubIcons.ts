import { Trophy, Briefcase, BarChart3, Boxes, PackageSearch, Clock, type LucideIcon } from 'lucide-react';

/**
 * Resolve o nome de ícone vindo do banco (`concremrh_hr_applications.icon`) para
 * o ícone real da biblioteca do projeto (lucide-react). Sem emojis, sem mistura
 * de estilos. Fallback estável em Trophy.
 */
const HUB_ICONS: Record<string, LucideIcon> = {
  Trophy,
  Briefcase,
  BarChart3,
  Boxes,
  PackageSearch,
  Clock,
};

export function resolveHubIcon(icon: string | null | undefined): LucideIcon {
  return (icon && HUB_ICONS[icon]) || Trophy;
}
