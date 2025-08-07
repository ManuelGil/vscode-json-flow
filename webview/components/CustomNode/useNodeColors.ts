import { useTheme } from '../ThemeProvider';

/**
 * Returns theme-aware class names for node backgrounds, borders, labels, and icons.
 * Ensures node UI elements adapt to the current color theme and color mode.
 */
export function useNodeColors() {
  const { colorMode, color } = useTheme();

  // Use CSS variables for background and border, and adapt label/icon for theme
  // These classes should be defined in the theme CSS files (e.g., .bg-card, .text-card-foreground)
  // Optionally, add color-specific classes if needed
  return {
    node: [
      'bg-card border-border hover:border-muted focus:ring-ring',
      `theme-${color}`, // For color-specific overrides if defined in CSS
    ],
    nodeSelected: 'border-primary',
    handle: ['bg-popover border-muted hover:border-primary', `theme-${color}`],
    toggleButton: [
      'border-muted bg-secondary hover:bg-secondary/80',
      `theme-${color}`,
    ],
    label: 'text-card-foreground', // Uses CSS variable for text color
    icon:
      colorMode === 'dark' ? 'text-muted-foreground' : 'text-muted-foreground',
  };
}
