import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

const themes = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const activeIndex = themes.findIndex((t) => t.value === theme);

  return (
    <div
      className="relative grid grid-cols-3 rounded-full border border-border bg-muted/50 p-0.5"
      role="radiogroup"
      aria-label="Theme"
    >
      <div
        className="absolute inset-y-0.5 rounded-full bg-background shadow-sm transition-[left] duration-200 ease-out"
        style={{
          width: `calc((100% - 4px) / 3)`,
          left: `calc(2px + ${activeIndex} * (100% - 4px) / 3)`,
        }}
      />
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          onClick={() => setTheme(value)}
          className="relative z-10 flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors aria-checked:text-foreground"
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
