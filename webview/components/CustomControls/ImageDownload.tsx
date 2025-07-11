import { zodResolver } from '@hookform/resolvers/zod';
import {
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
} from '@xyflow/react';
import { toBlob, toJpeg, toPng, toSvg } from 'html-to-image';
import { Check, Copy, Download, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Button,
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
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
} from '@webview/components';

const downloadSchema = z.object({
  fileName: z.string().min(2).max(50),
  fileExtension: z.enum(['png', 'jpg', 'svg']),
  backgroundColor: z.string().optional(),
});

const TAILWIND_COLORS = [
  { name: 'Slate', value: '#64748b', class: 'bg-slate-500 hover:bg-slate-500' },
  { name: 'Gray', value: '#6b7280', class: 'bg-gray-500 hover:bg-gray-500' },
  { name: 'Zinc', value: '#71717a', class: 'bg-zinc-500 hover:bg-zinc-500' },
  {
    name: 'Neutral',
    value: '#737373',
    class: 'bg-neutral-500 hover:bg-neutral-500',
  },
  { name: 'Stone', value: '#78716c', class: 'bg-stone-500 hover:bg-stone-500' },
  { name: 'Red', value: '#ef4444', class: 'bg-red-500 hover:bg-red-500' },
  {
    name: 'Orange',
    value: '#f97316',
    class: 'bg-orange-500 hover:bg-orange-500',
  },
  { name: 'Amber', value: '#f59e0b', class: 'bg-amber-500 hover:bg-amber-500' },
  {
    name: 'Yellow',
    value: '#eab308',
    class: 'bg-yellow-500 hover:bg-yellow-500',
  },
  { name: 'Lime', value: '#84cc16', class: 'bg-lime-500 hover:bg-lime-500' },
  { name: 'Green', value: '#22c55e', class: 'bg-green-500 hover:bg-green-500' },
  {
    name: 'Emerald',
    value: '#10b981',
    class: 'bg-emerald-500 hover:bg-emerald-500',
  },
  { name: 'Teal', value: '#14b8a6', class: 'bg-teal-500 hover:bg-teal-500' },
  { name: 'Cyan', value: '#06b6d4', class: 'bg-cyan-500 hover:bg-cyan-500' },
  { name: 'Sky', value: '#0ea5e9', class: 'bg-sky-500 hover:bg-sky-500' },
  { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500 hover:bg-blue-500' },
  {
    name: 'Indigo',
    value: '#6366f1',
    class: 'bg-indigo-500 hover:bg-indigo-500',
  },
  {
    name: 'Violet',
    value: '#8b5cf6',
    class: 'bg-violet-500 hover:bg-violet-500',
  },
  {
    name: 'Purple',
    value: '#a855f7',
    class: 'bg-purple-500 hover:bg-purple-500',
  },
  {
    name: 'Fuchsia',
    value: '#d946ef',
    class: 'bg-fuchsia-500 hover:bg-fuchsia-500',
  },
  { name: 'Pink', value: '#ec4899', class: 'bg-pink-500 hover:bg-pink-500' },
  { name: 'Rose', value: '#f43f5e', class: 'bg-rose-500 hover:bg-rose-500' },
  {
    name: 'Black',
    value: '#000000',
    class: 'bg-black hover:bg-black dark:border-muted-foreground dark:border',
  },
  {
    name: 'White',
    value: '#FFFFFF',
    class:
      'bg-white hover:bg-white border-muted-foreground border dark:border-none',
  },
] as const;

/**
 * ImageDownload component for exporting the flow diagram as an image or SVG.
 * Handles download and clipboard copy, background color selection, and file naming.
 * All handlers are memoized for performance.
 */
export function ImageDownload() {
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Memoize form initialization to prevent unnecessary recreations
  const downloadForm = useForm<z.infer<typeof downloadSchema>>({
    resolver: zodResolver(downloadSchema),
    defaultValues: {
      fileName: 'JsonFlow',
      fileExtension: 'png',
      backgroundColor: '#FFFFFF',
    },
  });

  const { getNodes } = useReactFlow();

  /**
   * Filter function to exclude certain elements from image export
   */
  const filter = useCallback((node: Node) => {
    const className = (node as HTMLElement).classList?.value || '';
    // Elements to exclude from the exported image
    const blacklist = [
      'react-flow__panel',
      'react-flow__minimap',
      'react-flow__controls',
      'nodrag',
    ];

    return !blacklist.some((blackItem) => className.includes(blackItem));
  }, []);

  /**
   * Main function to handle image export - either to file or clipboard
   * Memoized with dependencies on getNodes and filter
   */
  const downloadImage = useCallback(
    async (type?: 'download' | 'clipboard') => {
      const nodes = getNodes();
      // Add small delay to prevent flicker and ensure we get a clean image
      // This is important for when elements are still animating
      await new Promise((resolve) => setTimeout(resolve, 100));

      const nodesBounds = getNodesBounds(nodes);
      const width = nodesBounds.width;
      const height = nodesBounds.height;
      const xCenter = nodesBounds.x;
      const yCenter = nodesBounds.y;

      const viewport = getViewportForBounds(
        {
          x: xCenter,
          y: yCenter,
          width: width,
          height: height,
        },
        width,
        height,
        0.5,
        2,
        0.1,
      );

      const flowElement = document.querySelector(
        '.react-flow__viewport',
      ) as HTMLElement;
      if (!flowElement) {
        return;
      }

      const options = {
        backgroundColor: downloadForm.getValues('backgroundColor'),
        quality: 1,
        pixelRatio: 2,
        width,
        height,
        style: {
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
        filter,
      };

      if (type === 'clipboard') {
        const blob = await toBlob(flowElement, options);
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
        }
        return;
      }

      const fileExtension = downloadForm.getValues('fileExtension');
      const fileName = downloadForm.getValues('fileName');

      const downloadFn = {
        png: toPng,
        jpg: toJpeg,
        svg: toSvg,
      }[fileExtension];

      const dataUrl = await downloadFn(flowElement, options);
      const link = document.createElement('a');
      link.download = `${fileName}.${fileExtension}`;
      link.href = dataUrl;
      link.click();
    },
    [getNodes, downloadForm, filter],
  );

  const colorPickerRef = useRef<HTMLInputElement>(null);

  /**
   * Submit handler for the download form
   * Memoized with proper dependency on downloadImage
   */
  const onSubmit = useCallback(() => {
    downloadImage('download');
    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2000);
  }, [downloadImage]);

  const handleCopy = useCallback(async () => {
    await downloadImage('clipboard');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [downloadImage]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" tooltip="Download as Image">
          <Download />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download Settings</DialogTitle>
          <DialogDescription>Download the flow as an image.</DialogDescription>
        </DialogHeader>
        <Form {...downloadForm}>
          <form
            onSubmit={downloadForm.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={downloadForm.control}
              name="fileName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter file name" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the name of the file that will be downloaded.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={downloadForm.control}
              name="fileExtension"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Extension</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex w-full justify-between gap-2 rounded-md border bg-muted p-1"
                    >
                      <div
                        className={`flex items-center w-full justify-center h-full p-2 text-muted-foreground rounded-md transition-all ${
                          field.value === 'png'
                            ? 'bg-background text-primary shadow'
                            : ''
                        }`}
                      >
                        <RadioGroupItem
                          value="png"
                          id="png"
                          className="hidden"
                        />
                        <Label
                          htmlFor="png"
                          className="w-full cursor-pointer text-center"
                        >
                          PNG
                        </Label>
                      </div>
                      <div
                        className={`flex items-center w-full justify-center h-full p-2 text-muted-foreground rounded-md transition-all ${
                          field.value === 'jpg'
                            ? 'bg-background text-primary shadow'
                            : ''
                        }`}
                      >
                        <RadioGroupItem
                          value="jpg"
                          id="jpg"
                          className="hidden"
                        />
                        <Label
                          htmlFor="jpg"
                          className="w-full cursor-pointer text-center"
                        >
                          JPG
                        </Label>
                      </div>
                      <div
                        className={`flex items-center w-full justify-center h-full p-2 text-muted-foreground rounded-md transition-all ${
                          field.value === 'svg'
                            ? 'bg-background text-primary shadow'
                            : ''
                        }`}
                      >
                        <RadioGroupItem
                          value="svg"
                          id="svg"
                          className="hidden"
                        />
                        <Label
                          htmlFor="svg"
                          className="w-full cursor-pointer text-center"
                        >
                          SVG
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={downloadForm.control}
              name="backgroundColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Background Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              onClick={() => colorPickerRef.current?.click()}
                              style={{ backgroundColor: field.value }}
                              tooltip="Select custom color"
                              className={
                                field.value === 'transparent'
                                  ? 'bg-transparent hover:bg-transparent border border-muted-foreground'
                                  : ''
                              }
                            />
                          </PopoverTrigger>
                          <PopoverContent className="h-auto w-auto">
                            <HexColorPicker
                              color={field.value}
                              onChange={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          className="w-24"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {TAILWIND_COLORS.map((color) => (
                          <Button
                            key={color.name}
                            type="button"
                            className={color.class}
                            size="icon"
                            onClick={() => field.onChange(color.value)}
                            tooltip={color.name}
                          />
                        ))}
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => field.onChange('transparent')}
                          tooltip="Transparent"
                          className="border border-muted-foreground bg-transparent hover:bg-transparent [&_svg]:size-8"
                        >
                          <X className="text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleCopy}>
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {isCopied ? 'Copied!' : 'Copy to clipboard'}
              </Button>
              <Button type="submit">
                {isDownloaded ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isDownloaded ? 'Downloaded!' : 'Download'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
