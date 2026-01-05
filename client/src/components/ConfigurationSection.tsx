import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, Save, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ConfigurationSection() {
  const { data: config, isLoading, refetch } = trpc.analysis.getConfig.useQuery();
  const { data: defaultConfig } = trpc.analysis.getDefaultConfig.useQuery();
  const refreshConfigMutation = trpc.analysis.refreshConfig.useMutation();
  const updateConfigMutation = trpc.analysis.updateConfig.useMutation();

  const [editedConfig, setEditedConfig] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentConfig = editedConfig || config;

  const handleRefresh = async () => {
    try {
      await refreshConfigMutation.mutateAsync();
      await refetch();
      setEditedConfig(null);
      toast.success("Configuration refreshed from GCS");
    } catch (error: any) {
      toast.error(`Failed to refresh: ${error.message}`);
    }
  };

  const handleSave = async () => {
    if (!editedConfig) {
      toast.error("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      await updateConfigMutation.mutateAsync({ config: editedConfig });
      await refetch();
      setEditedConfig(null);
      toast.success("Configuration saved to GCS");
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (defaultConfig) {
      setEditedConfig(defaultConfig);
      toast.info("Reset to default configuration");
    }
  };

  const updateSystemPrompt = (key: string, value: string) => {
    setEditedConfig({
      ...currentConfig,
      systemPrompts: {
        ...currentConfig.systemPrompts,
        [key]: value,
      },
    });
  };

  const updateOutputSchema = (key: string, field: "tableName" | "schema", value: any) => {
    setEditedConfig({
      ...currentConfig,
      outputSchemas: {
        ...currentConfig.outputSchemas,
        [key]: {
          ...currentConfig.outputSchemas[key],
          [field]: value,
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentConfig) {
    return (
      <Alert>
        <AlertDescription>Failed to load configuration</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Management</CardTitle>
          <CardDescription>
            Manage system prompts, output schemas, and BigQuery tables
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh from GCS
          </Button>
          <Button onClick={handleSave} disabled={!editedConfig || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save to GCS
              </>
            )}
          </Button>
          <Button onClick={handleResetToDefault} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
        </CardContent>
      </Card>

      {/* System Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompts</CardTitle>
          <CardDescription>
            Configure prompts for each filetype and focus combination
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="image-branding" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="image-branding">Image-Branding</TabsTrigger>
              <TabsTrigger value="image-performance">Image-Performance</TabsTrigger>
              <TabsTrigger value="video-branding">Video-Branding</TabsTrigger>
              <TabsTrigger value="video-performance">Video-Performance</TabsTrigger>
            </TabsList>

            {Object.entries(currentConfig.systemPrompts).map(([key, value]) => (
              <TabsContent key={key} value={key} className="space-y-4">
                <div>
                  <Label htmlFor={`prompt-${key}`}>System Prompt</Label>
                  <Textarea
                    id={`prompt-${key}`}
                    value={value as string}
                    onChange={(e) => updateSystemPrompt(key, e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Use template variables: {"{brand}"}, {"{targetAudience}"}, {"{category}"},{" "}
                    {"{primaryMessage}"}, {"{secondaryMessage1}"}, {"{secondaryMessage2}"}
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Output Schemas */}
      <Card>
        <CardHeader>
          <CardTitle>Output Schemas & BigQuery Tables</CardTitle>
          <CardDescription>
            Configure JSON schemas and BigQuery table names
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="image-branding" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="image-branding">Image-Branding</TabsTrigger>
              <TabsTrigger value="image-performance">Image-Performance</TabsTrigger>
              <TabsTrigger value="video-branding">Video-Branding</TabsTrigger>
              <TabsTrigger value="video-performance">Video-Performance</TabsTrigger>
            </TabsList>

            {Object.entries(currentConfig.outputSchemas).map(([key, value]: [string, any]) => (
              <TabsContent key={key} value={key} className="space-y-4">
                <div>
                  <Label htmlFor={`table-${key}`}>BigQuery Table Name</Label>
                  <Input
                    id={`table-${key}`}
                    value={value.tableName}
                    onChange={(e) => updateOutputSchema(key, "tableName", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`schema-${key}`}>JSON Schema</Label>
                  <Textarea
                    id={`schema-${key}`}
                    value={JSON.stringify(value.schema, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateOutputSchema(key, "schema", parsed);
                      } catch (error) {
                        // Invalid JSON, don't update
                      }
                    }}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Define expected fields and types (string, integer, array, object)
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Context Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Context Fields</CardTitle>
          <CardDescription>
            Default context fields for file uploads (read-only in this version)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentConfig.contextFields.map((field: any) => (
              <div key={field.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{field.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {field.name} • {field.type} • {field.required ? "Required" : "Optional"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
