import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, FileText, Database, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { PromptConfig } from "../../../shared/promptTypes";

export default function ConfigurationSection() {
  const { data: promptsData, isLoading, refetch } = trpc.prompts.list.useQuery();
  const initializeDefaultsMutation = trpc.prompts.initializeDefaults.useMutation();
  const updatePromptMutation = trpc.prompts.update.useMutation();
  const createPromptMutation = trpc.prompts.create.useMutation();

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<PromptConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPromptData, setNewPromptData] = useState({
    id: "",
    name: "",
    description: "",
    filetype: "image" as "image" | "video",
    focus: "branding" as "branding" | "performance",
    bigqueryTable: "",
  });

  const { data: selectedPromptData } = trpc.prompts.get.useQuery(
    { promptId: selectedPromptId! },
    { enabled: !!selectedPromptId }
  );

  const currentPrompt = editedPrompt || selectedPromptData?.prompt;

  const handleInitializeDefaults = async () => {
    try {
      const result = await initializeDefaultsMutation.mutateAsync();
      toast.success(`Initialized ${result.initialized} default prompts to GCS`);
      await refetch();
    } catch (error: any) {
      toast.error(`Failed to initialize: ${error.message}`);
    }
  };

  const handleCreatePrompt = async () => {
    // Validation
    if (!newPromptData.id || !newPromptData.name || !newPromptData.bigqueryTable) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(newPromptData.id)) {
      toast.error("Prompt ID must be lowercase alphanumeric with underscores only");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(newPromptData.bigqueryTable)) {
      toast.error("BigQuery table name must be lowercase alphanumeric with underscores only");
      return;
    }

    try {
      await createPromptMutation.mutateAsync({
        ...newPromptData,
        systemPrompt: "# Add your system prompt here\n\n",
        outputSchema: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: false,
        },
      });
      toast.success(`Created prompt: ${newPromptData.name}`);
      await refetch();
      setIsCreatingNew(false);
      setNewPromptData({
        id: "",
        name: "",
        description: "",
        filetype: "image",
        focus: "branding",
        bigqueryTable: "",
      });
      // Select the newly created prompt
      setSelectedPromptId(newPromptData.id);
    } catch (error: any) {
      toast.error(`Failed to create prompt: ${error.message}`);
    }
  };

  const handleSelectPrompt = (promptId: string) => {
    setSelectedPromptId(promptId);
    setEditedPrompt(null);
  };

  const handleSave = async () => {
    if (!editedPrompt) {
      toast.error("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      await updatePromptMutation.mutateAsync({
        id: editedPrompt.id,
        name: editedPrompt.name,
        description: editedPrompt.description,
        systemPrompt: editedPrompt.systemPrompt,
        outputSchema: editedPrompt.outputSchema,
        bigqueryTable: editedPrompt.bigqueryTable,
        version: editedPrompt.version,
      });
      toast.success("Prompt saved to GCS");
      await refetch();
      setEditedPrompt(null);
      // Refresh the selected prompt
      if (selectedPromptId) {
        setSelectedPromptId(null);
        setTimeout(() => setSelectedPromptId(editedPrompt.id), 100);
      }
    } catch (error: any) {
      if (error.message.includes("CONFLICT")) {
        toast.error("Prompt was modified by another user. Please refresh and try again.");
      } else if (error.message.includes("FORBIDDEN")) {
        toast.error("You don't have permission to modify this prompt");
      } else {
        toast.error(`Failed to save: ${error.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditedPrompt(null);
    toast.info("Changes discarded");
  };

  const updateField = (field: keyof PromptConfig, value: any) => {
    if (!currentPrompt) return;
    setEditedPrompt({
      ...currentPrompt,
      [field]: value,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!promptsData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load prompts</AlertDescription>
      </Alert>
    );
  }

  const { prompts, source } = promptsData;

  return (
    <div className="space-y-6">
      {/* Status & Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt Management</CardTitle>
          <CardDescription>
            Manage AI prompts and output schemas stored in Google Cloud Storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={source === "gcs" ? "default" : "secondary"}>
              {source === "gcs" ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Connected to GCS
                </>
              ) : (
                <>
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Using fallback defaults
                </>
              )}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {prompts.length} prompts available
            </span>
          </div>

          {source === "fallback" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                GCS connection failed. Using hardcoded defaults. Click "Initialize Defaults" to copy them to GCS.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button onClick={handleInitializeDefaults} variant="outline" disabled={initializeDefaultsMutation.isPending}>
              {initializeDefaultsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Initialize Defaults
                </>
              )}
            </Button>
            <Button onClick={() => setIsCreatingNew(true)} variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Create New Prompt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prompt List & Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompt List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Prompts</CardTitle>
            <CardDescription>Select a prompt to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handleSelectPrompt(prompt.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedPromptId === prompt.id
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-accent border-border"
                }`}
              >
                <div className="font-medium text-sm">{prompt.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {prompt.filetype} • {prompt.focus}
                  {prompt.isDefault && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Prompt Editor */}
        <div className="lg:col-span-2">
          {!currentPrompt ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a prompt to view and edit</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{currentPrompt.name}</CardTitle>
                    <CardDescription>{currentPrompt.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={!editedPrompt || isSaving} size="sm">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button onClick={handleReset} variant="outline" disabled={!editedPrompt} size="sm">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="prompt" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="prompt">System Prompt</TabsTrigger>
                    <TabsTrigger value="schema">Output Schema</TabsTrigger>
                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  </TabsList>

                  <TabsContent value="prompt" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="systemPrompt">System Prompt</Label>
                      <Textarea
                        id="systemPrompt"
                        value={currentPrompt.systemPrompt}
                        onChange={(e) => updateField("systemPrompt", e.target.value)}
                        rows={20}
                        className="font-mono text-sm mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Use template variables: {"{brand}"}, {"{targetAudience}"}, {"{category}"},{" "}
                        {"{primaryMessage}"}, {"{secondaryMessage1}"}, {"{secondaryMessage2}"}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="schema" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="bigqueryTable">BigQuery Table Name</Label>
                      <Input
                        id="bigqueryTable"
                        value={currentPrompt.bigqueryTable}
                        onChange={(e) => updateField("bigqueryTable", e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="outputSchema">JSON Schema</Label>
                      <Textarea
                        id="outputSchema"
                        value={JSON.stringify(currentPrompt.outputSchema, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            updateField("outputSchema", parsed);
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                        rows={16}
                        className="font-mono text-sm mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Define expected output structure with types (string, integer, array, object)
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="metadata" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="name">Prompt Name</Label>
                      <Input
                        id="name"
                        value={currentPrompt.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={currentPrompt.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        rows={3}
                        className="mt-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>File Type</Label>
                        <div className="mt-2 p-3 bg-muted rounded-md text-sm">{currentPrompt.filetype}</div>
                      </div>
                      <div>
                        <Label>Focus</Label>
                        <div className="mt-2 p-3 bg-muted rounded-md text-sm">{currentPrompt.focus}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Version</Label>
                        <div className="mt-2 p-3 bg-muted rounded-md text-sm">v{currentPrompt.version}</div>
                      </div>
                      <div>
                        <Label>Created By</Label>
                        <div className="mt-2 p-3 bg-muted rounded-md text-sm truncate">
                          {currentPrompt.createdBy}
                        </div>
                      </div>
                    </div>
                    {currentPrompt.isDefault && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This is a default prompt. Only admins can modify it.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* GCS Bucket Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>GCS Bucket Configuration</CardTitle>
          <CardDescription>
            Configure Google Cloud Storage bucket for prompt storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              GCS bucket is configured via environment variables. See{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">GCS_BUCKET_SETUP.md</code> for setup instructions.
              <br />
              <br />
              Current bucket: <code className="text-xs bg-muted px-1 py-0.5 rounded">maira-creative-marker</code>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Create New Prompt Dialog */}
      {isCreatingNew && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Create New Prompt</CardTitle>
            <CardDescription>Define a new custom prompt configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newId">Prompt ID *</Label>
                <Input
                  id="newId"
                  placeholder="e.g., custom_video_analysis"
                  value={newPromptData.id}
                  onChange={(e) => setNewPromptData({ ...newPromptData, id: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lowercase alphanumeric with underscores only
                </p>
              </div>
              <div>
                <Label htmlFor="newName">Prompt Name *</Label>
                <Input
                  id="newName"
                  placeholder="e.g., Custom Video Analysis"
                  value={newPromptData.name}
                  onChange={(e) => setNewPromptData({ ...newPromptData, name: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="newDescription">Description</Label>
              <Textarea
                id="newDescription"
                placeholder="Describe what this prompt analyzes..."
                value={newPromptData.description}
                onChange={(e) => setNewPromptData({ ...newPromptData, description: e.target.value })}
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newFiletype">File Type *</Label>
                <select
                  id="newFiletype"
                  value={newPromptData.filetype}
                  onChange={(e) => setNewPromptData({ ...newPromptData, filetype: e.target.value as "image" | "video" })}
                  className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div>
                <Label htmlFor="newFocus">Analysis Focus *</Label>
                <select
                  id="newFocus"
                  value={newPromptData.focus}
                  onChange={(e) => setNewPromptData({ ...newPromptData, focus: e.target.value as "branding" | "performance" })}
                  className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="branding">Branding</option>
                  <option value="performance">Performance</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="newBigqueryTable">BigQuery Table Name *</Label>
              <Input
                id="newBigqueryTable"
                placeholder="e.g., custom_video_analysis"
                value={newPromptData.bigqueryTable}
                onChange={(e) => setNewPromptData({ ...newPromptData, bigqueryTable: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lowercase alphanumeric with underscores only
              </p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                After creating the prompt, you'll need to add the system prompt and output schema in the editor.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button onClick={() => setIsCreatingNew(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleCreatePrompt} disabled={createPromptMutation.isPending}>
                Create Prompt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
