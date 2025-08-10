import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@webview/lib/utils';
import * as React from 'react';

/**
 * Tabs component collection
 * Built on top of Radix UI's Tabs primitives
 * Provides accessible tabbed interface functionality
 */

const Tabs = TabsPrimitive.Root;

/**
 * Props for TabsList component
 */
type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>;

/**
 * Container for tab triggers/buttons
 * Used for housing the interactive tab buttons
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/**
 * Props for TabsTrigger component
 */
type TabsTriggerProps = React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Trigger
>;

/**
 * Interactive tab button
 * Controls which tab content panel is shown
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/**
 * Props for TabsContent component
 */
type TabsContentProps = React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Content
>;

/**
 * Content panel for tabs
 * Displays content associated with the selected tab
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
