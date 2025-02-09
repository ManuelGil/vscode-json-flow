import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  Input,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@webview/components';
import { Copy, Download, Settings as SettingsIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const generalSettingsSchema = z.object({
  general: z.string().min(2).max(50),
});

const nodeSettingsSchema = z.object({
  node: z.string().min(2).max(50),
});

const edgeSettingsSchema = z.object({
  edge: z.string().min(2).max(50),
});

const textSettingsSchema = z.object({
  text: z.string().min(2).max(50),
});

export function Settings() {
  const generalSettingsForm = useForm<z.infer<typeof generalSettingsSchema>>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      general: 'JsonFlow General Settings',
    },
  });

  async function onGeneralSettingsSubmit() {
    console.log(generalSettingsForm.getValues());
  }

  const nodeSettingsForm = useForm<z.infer<typeof nodeSettingsSchema>>({
    resolver: zodResolver(nodeSettingsSchema),
    defaultValues: {
      node: 'JsonFlow Node Settings',
    },
  });

  async function onNodeSettingsSubmit() {
    console.log(nodeSettingsForm.getValues());
  }

  const edgeSettingsForm = useForm<z.infer<typeof edgeSettingsSchema>>({
    resolver: zodResolver(edgeSettingsSchema),
    defaultValues: {
      edge: 'JsonFlow Edge Settings',
    },
  });

  async function onEdgeSettingsSubmit() {
    console.log(edgeSettingsForm.getValues());
  }

  const textSettingsForm = useForm<z.infer<typeof textSettingsSchema>>({
    resolver: zodResolver(textSettingsSchema),
    defaultValues: {
      text: 'JsonFlow Text Settings',
    },
  });

  async function onTextSettingsSubmit() {
    console.log(textSettingsForm.getValues());
  }

  return (
    <Dialog>
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
        <Tabs defaultValue="general">
          <TabsList className="w-full justify-between">
            <TabsTrigger value="general" className="w-full">
              General
            </TabsTrigger>
            <TabsTrigger value="node" className="w-full">
              Node
            </TabsTrigger>
            <TabsTrigger value="edge" className="w-full">
              Edge
            </TabsTrigger>
            <TabsTrigger value="text" className="w-full">
              Text
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Form {...generalSettingsForm}>
              <form
                onSubmit={generalSettingsForm.handleSubmit(
                  onGeneralSettingsSubmit,
                )}
                className="space-y-4"
              >
                <FormField
                  control={generalSettingsForm.control}
                  name="general"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter general settings"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        General settings for the flow.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary">
                    <Copy /> Copy to clipboard
                  </Button>
                  <Button type="submit" onClick={onGeneralSettingsSubmit}>
                    <Download /> Download
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="node">
            <Form {...nodeSettingsForm}>
              <form
                onSubmit={nodeSettingsForm.handleSubmit(onNodeSettingsSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={nodeSettingsForm.control}
                  name="node"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Node</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter node settings" {...field} />
                      </FormControl>
                      <FormDescription>
                        Node settings for the flow.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary">
                    <Copy /> Copy to clipboard
                  </Button>
                  <Button type="submit" onClick={onNodeSettingsSubmit}>
                    <Download /> Download
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="edge">
            <Form {...edgeSettingsForm}>
              <form
                onSubmit={edgeSettingsForm.handleSubmit(onEdgeSettingsSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={edgeSettingsForm.control}
                  name="edge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edge</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter edge settings" {...field} />
                      </FormControl>
                      <FormDescription>
                        Edge settings for the flow.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary">
                    <Copy /> Copy to clipboard
                  </Button>
                  <Button type="submit" onClick={onEdgeSettingsSubmit}>
                    <Download /> Download
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="text">
            <Form {...textSettingsForm}>
              <form
                onSubmit={textSettingsForm.handleSubmit(onTextSettingsSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={textSettingsForm.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter text settings" {...field} />
                      </FormControl>
                      <FormDescription>
                        Text settings for the flow.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary">
                    <Copy /> Copy to clipboard
                  </Button>
                  <Button type="submit" onClick={onTextSettingsSubmit}>
                    <Download /> Download
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
