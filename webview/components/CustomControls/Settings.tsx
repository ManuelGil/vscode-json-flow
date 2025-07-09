import { zodResolver } from '@hookform/resolvers/zod';
import { BackgroundVariant } from '@xyflow/react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, Switch } from '@webview/components/atoms';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@webview/components/organisms';
import { useTheme } from '@webview/components/ThemeProvider';
import { type Color, colorClasses, colors } from '@webview/themes/colors';
import { EDGE_TYPE_NAMES, EdgeType } from '@webview/types';

interface Settings {
  edgeType: EdgeType;
  animated: boolean;
  backgroundVariant: BackgroundVariant;
  color: Color;
}

const settingsSchema = z.object({
  settings: z.object({
    edgeType: z.nativeEnum(EdgeType),
    animated: z.boolean(),
    backgroundVariant: z.nativeEnum(BackgroundVariant),
    color: z.enum(colors),
  }),
});

export const DEFAULT_SETTINGS: Settings = {
  edgeType: EdgeType.SmoothStep,
  animated: true,
  backgroundVariant: BackgroundVariant.Lines,
  color: 'neutral',
};

interface SettingsProps {
  onSettingsChange: (newSettings: Settings) => void;
}

export function Settings({ onSettingsChange }: SettingsProps) {
  const { setColor } = useTheme();
  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      settings: {
        ...DEFAULT_SETTINGS,
        ...(localStorage.getItem('settings')
          ? JSON.parse(localStorage.getItem('settings')!)
          : {}),
      },
    },
    mode: 'onChange',
  });

  const { isDirty } = form.formState;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      const savedSettings = localStorage.getItem('settings')
        ? JSON.parse(localStorage.getItem('settings')!)
        : DEFAULT_SETTINGS;

      form.reset({ settings: savedSettings });
      setIsDialogOpen(true);
    } else if (isDirty && !showConfirmDialog) {
      setShowConfirmDialog(true);
    } else if (!isDirty) {
      setIsDialogOpen(false);
    }
  };

  const onSubmit = (data: z.infer<typeof settingsSchema>) => {
    localStorage.setItem('settings', JSON.stringify(data.settings));
    setColor(data.settings.color);
    onSettingsChange(data.settings);
    form.reset({ settings: data.settings });
    setIsDialogOpen(false);
  };

  const handleResetDefaults = () => {
    localStorage.setItem('settings', JSON.stringify(DEFAULT_SETTINGS));
    form.reset({ settings: DEFAULT_SETTINGS });
  };

  const handleCloseWithoutSaving = () => {
    setShowConfirmDialog(false);
    setIsDialogOpen(false);
  };

  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" tooltip="Settings">
            <SettingsIcon />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure the settings for the flow.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="settings.color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme Color</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select theme color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colors.map((color) => (
                          <SelectItem key={color} value={color}>
                            <div className="flex items-center justify-between gap-2">
                              <span>
                                {color.charAt(0).toUpperCase() + color.slice(1)}
                              </span>
                              <div
                                className={`h-4 w-4 rounded-full ${colorClasses[color]}`}
                              />
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the color theme for the application.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="settings.backgroundVariant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Background Pattern</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select background pattern" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(BackgroundVariant).map(
                          ([key, value]) => (
                            <SelectItem key={value} value={value}>
                              {key}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the background pattern style for the flow.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="settings.edgeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edge Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select edge type">
                            {field.value && EDGE_TYPE_NAMES[field.value]}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EDGE_TYPE_NAMES).map(([type, name]) => (
                          <SelectItem key={type} value={type}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the type of edge connection.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="settings.animated"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Animated Edges
                      </FormLabel>
                      <FormDescription>
                        Enable or disable edge animations
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetDefaults}
                >
                  Reset to Defaults
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showConfirmDialog}
        onOpenChange={(open) => !open && handleCancelClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to close without
              saving?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancelClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCloseWithoutSaving}>
              Close Without Saving
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
