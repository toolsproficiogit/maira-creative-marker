import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, Play, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ResultsDisplay } from "@/components/ResultsDisplay";


interface UploadedFile {
  file: File;
  fileId?: number;
  filetype?: "image" | "video";
  contextFields: {
    brand: string;
    targetAudience: string;
    category: string;
    primaryMessage: string;
    secondaryMessage1: string;
    secondaryMessage2: string;
    version?: string;
  };
}

export default function ToolUseSection() {
  // Persist session ID in localStorage to prevent regeneration on tab switch
  const [sessionId, setSessionId] = useState<number | null>(() => {
    const stored = localStorage.getItem('analysisSessionId');
    return stored ? parseInt(stored, 10) : null;
  });
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]); // Files selected but not yet uploaded
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set()); // Files selected for analysis
  const [filePromptSelections, setFilePromptSelections] = useState<Map<number, string>>(new Map()); // fileId -> promptId
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [focus, setFocus] = useState<"branding" | "performance">("branding");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragFileCount, setDragFileCount] = useState(0);
  const [expandedPendingFiles, setExpandedPendingFiles] = useState<Set<number>>(new Set());

  const createSessionMutation = trpc.analysis.createSession.useMutation();
  const uploadFileMutation = trpc.analysis.uploadFile.useMutation();
  const generateUploadUrlMutation = trpc.analysis.generateUploadUrl.useMutation();
  const updateFileUrlMutation = trpc.analysis.updateFileUrl.useMutation();
  const runAnalysisMutation = trpc.analysis.runAnalysis.useMutation();
  const { data: configData } = trpc.analysis.getConfig.useQuery();
  const { data: sessionFiles, refetch: refetchSessionFiles } = trpc.analysis.getSessionFiles.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );
  const { data: availablePrompts } = trpc.prompts.list.useQuery();

  useEffect(() => {
    // Create session only if we don't have one
    if (!sessionId) {
      createSessionMutation.mutate(undefined, {
        onSuccess: (data) => {
          setSessionId(data.sessionId);
          localStorage.setItem('analysisSessionId', data.sessionId.toString());
          toast.success("Session created");
        },
        onError: (error) => {
          toast.error(`Failed to create session: ${error.message}`);
        },
      });
    }
  }, [sessionId]);
  
  // Load uploaded files from session when component mounts or session changes
  useEffect(() => {
    if (sessionFiles && sessionFiles.length > 0) {
      // Convert database files to UploadedFile format (without File objects)
      const existingFiles: UploadedFile[] = sessionFiles.map(f => ({
        file: null as any, // File object not available after upload
        fileId: f.id,
        filetype: f.filetype,
        contextFields: {
          brand: f.brand,
          targetAudience: f.targetAudience,
          category: f.category,
          primaryMessage: f.primaryMessage,
          secondaryMessage1: f.secondaryMessage1,
          secondaryMessage2: f.secondaryMessage2,
          version: f.version || "",
        },
      }));
      setUploadedFiles(existingFiles);
      
      // Select all files by default
      const allFileIds = existingFiles.map(f => f.fileId!).filter(id => id !== undefined);
      setSelectedFileIds(new Set(allFileIds));
    }
  }, [sessionFiles]);



  const processFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      contextFields: {
        brand: "",
        targetAudience: "",
        category: "",
        primaryMessage: "",
        secondaryMessage1: "",
        secondaryMessage2: "",
        version: "",
      },
    }));
    setPendingFiles([...pendingFiles, ...newFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
      const items = e.dataTransfer.items;
      setDragFileCount(items.length);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
      setDragFileCount(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragFileCount(0);

    const files = Array.from(e.dataTransfer.files);
    
    // Validate file types
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type.startsWith('video/');
      if (!isValid) {
        toast.error(`${file.name} is not a valid image or video file`);
      }
      return isValid;
    });

    // Validate file sizes (1GB limit)
    const sizeValidFiles = validFiles.filter(file => {
      const isValid = file.size <= 1024 * 1024 * 1024;
      if (!isValid) {
        toast.error(`${file.name} exceeds 1GB size limit`);
      }
      return isValid;
    });

    if (sizeValidFiles.length > 0) {
      processFiles(sizeValidFiles);
      toast.success(`Added ${sizeValidFiles.length} file${sizeValidFiles.length > 1 ? 's' : ''}`);
    }
  };

  const handleResetSession = async () => {
    if (!confirm('Are you sure you want to reset this session? This will remove all uploaded files and clear the session.')) {
      return;
    }

    // Clear local state
    setPendingFiles([]);
    setUploadedFiles([]);
    setSelectedFileIds(new Set());
    setResults([]);
    setExpandedPendingFiles(new Set());
    
    // Clear session from localStorage and create new one
    localStorage.removeItem('analysisSessionId');
    setSessionId(null);
    
    toast.success('Session reset successfully');
  };

  const toggleExpandPendingFile = (index: number) => {
    const newExpanded = new Set(expandedPendingFiles);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPendingFiles(newExpanded);
  };

  const expandAllPendingFiles = () => {
    setExpandedPendingFiles(new Set(pendingFiles.map((_, i) => i)));
  };

  const collapseAllPendingFiles = () => {
    setExpandedPendingFiles(new Set());
  };

  const setFilePrompt = (fileId: number, promptId: string) => {
    setFilePromptSelections(new Map(filePromptSelections.set(fileId, promptId)));
  };

  const getDefaultPromptForFile = (file: UploadedFile) => {
    if (!availablePrompts) return null;
    // Find default prompt matching file type and branding focus
    const defaultPrompt = availablePrompts.prompts.find(
      (p: any) => p.filetype === file.filetype && p.focus === 'branding' && p.isDefault
    );
    return defaultPrompt?.id || null;
  };

  // Auto-select default prompts when files are loaded
  useEffect(() => {
    if (uploadedFiles.length > 0 && availablePrompts) {
      const newSelections = new Map(filePromptSelections);
      uploadedFiles.forEach(file => {
        if (file.fileId && !newSelections.has(file.fileId)) {
          const defaultPrompt = getDefaultPromptForFile(file);
          if (defaultPrompt) {
            newSelections.set(file.fileId, defaultPrompt);
          }
        }
      });
      setFilePromptSelections(newSelections);
    }
  }, [uploadedFiles, availablePrompts]);

  const updateContextField = (index: number, field: string, value: string) => {
    const updated = [...pendingFiles];
    updated[index].contextFields = {
      ...updated[index].contextFields,
      [field]: value,
    };
    setPendingFiles(updated);
  };

  const removeFile = (index: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (!sessionId) {
      toast.error("No active session");
      return;
    }
    
    if (pendingFiles.length === 0) {
      toast.info("No files to upload");
      return;
    }

    for (let i = 0; i < pendingFiles.length; i++) {
      const pendingFile = pendingFiles[i];
      
      // Update progress
      setUploadProgress({
        current: i + 1,
        total: pendingFiles.length,
        fileName: pendingFile.file.name,
      });

      try {
        // Step 1: Generate signed upload URL
        const urlData = await generateUploadUrlMutation.mutateAsync({
          sessionId,
          filename: pendingFile.file.name,
          contentType: pendingFile.file.type,
        });

        // Step 2: Upload file directly to GCS using signed URL
        const uploadResponse = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": pendingFile.file.type,
          },
          body: pendingFile.file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`GCS upload failed: ${uploadResponse.statusText}`);
        }

        // Step 3: Create file metadata record
        const metadata = await uploadFileMutation.mutateAsync({
          sessionId,
          filename: pendingFile.file.name,
          mimeType: pendingFile.file.type,
          fileSize: pendingFile.file.size,
          contextFields: pendingFile.contextFields,
        });

        // Step 4: Update file record with public URL
        await updateFileUrlMutation.mutateAsync({
          fileId: metadata.fileId,
          fileUrl: urlData.publicUrl,
        });

        toast.success(`Uploaded: ${pendingFile.file.name}`);
      } catch (error: any) {
        toast.error(`Failed to upload ${pendingFile.file.name}: ${error.message}`);
      }
    }
    
    // Clear pending files, progress, and refetch session files
    setPendingFiles([]);
    setUploadProgress(null);
    await refetchSessionFiles();
  };
  
  const toggleFileSelection = (fileId: number) => {
    const newSelected = new Set(selectedFileIds);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFileIds(newSelected);
  };
  
  const selectAllFiles = () => {
    const allFileIds = uploadedFiles.map(f => f.fileId!).filter(id => id !== undefined);
    setSelectedFileIds(new Set(allFileIds));
  };
  
  const deselectAllFiles = () => {
    setSelectedFileIds(new Set());
  };

  const handleRunAnalysis = async () => {
    if (!sessionId) {
      toast.error("No active session");
      return;
    }
    
    if (pendingFiles.length > 0) {
      toast.error("Please upload all pending files first");
      return;
    }
    
    if (selectedFileIds.size === 0) {
      toast.error("Please select at least one file to analyze");
      return;
    }

    // Validate that all selected files have prompts assigned
    const selectedFilesArray = Array.from(selectedFileIds);
    const filesWithoutPrompts = selectedFilesArray.filter(fileId => !filePromptSelections.get(fileId));
    if (filesWithoutPrompts.length > 0) {
      toast.error(`Please select prompts for all files (${filesWithoutPrompts.length} missing)`);
      return;
    }

    // Build file-prompt pairs
    const filePromptPairs = selectedFilesArray.map(fileId => ({
      fileId,
      promptId: filePromptSelections.get(fileId)!,
    }));

    setIsAnalyzing(true);
    try {
      const result = await runAnalysisMutation.mutateAsync({
        sessionId,
        filePromptPairs,
      });

      setResults(result.results);
      toast.success("Analysis complete!");
    } catch (error: any) {
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleResultExpanded = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  // formatResultData removed - now using ResultsDisplay component

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Upload videos or images (up to 1GB each)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            } ${!sessionId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {isDragging ? (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-primary animate-bounce" />
                <p className="text-lg font-semibold text-primary">
                  Drop {dragFileCount} file{dragFileCount > 1 ? 's' : ''} here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Drag and drop files here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
                <p className="text-xs text-muted-foreground">Images and videos up to 1GB each</p>
              </div>
            )}
            <Input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              disabled={!sessionId}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Reset Session Button */}
          {(pendingFiles.length > 0 || uploadedFiles.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSession}
              className="w-full"
            >
              Reset Session
            </Button>
          )}

          {/* Pending files (not yet uploaded) */}
          {pendingFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Pending Upload ({pendingFiles.length})</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={expandAllPendingFiles}
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={collapseAllPendingFiles}
                  >
                    Collapse All
                  </Button>
                </div>
              </div>
              {pendingFiles.map((pendingFile, index) => {
                const isExpanded = expandedPendingFiles.has(index);
                return (
                  <Card key={`pending-${index}`} className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="cursor-pointer" onClick={() => toggleExpandPendingFile(index)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <CardTitle className="text-base">
                            {pendingFile.file.name}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      <CardDescription>
                        {(pendingFile.file.size / 1024 / 1024).toFixed(2)} MB • {pendingFile.file.type}
                      </CardDescription>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="grid gap-4">
                    {configData?.contextFields.map((field) => (
                      <div key={field.name}>
                        <Label htmlFor={`pending-${index}-${field.name}`}>
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            id={`pending-${index}-${field.name}`}
                            value={pendingFile.contextFields[field.name as keyof typeof pendingFile.contextFields] || ""}
                            onChange={(e) => updateContextField(index, field.name, e.target.value)}
                            required={field.required}
                          />
                        ) : (
                          <Input
                            id={`pending-${index}-${field.name}`}
                            value={pendingFile.contextFields[field.name as keyof typeof pendingFile.contextFields] || ""}
                            onChange={(e) => updateContextField(index, field.name, e.target.value)}
                            required={field.required}
                          />
                        )}
                      </div>
                    ))}
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              <Button onClick={handleUploadAll} disabled={!sessionId || uploadProgress !== null} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                {uploadProgress ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : `Upload ${pendingFiles.length} File${pendingFiles.length > 1 ? 's' : ''}`}
              </Button>
              
              {/* Upload progress indicator */}
              {uploadProgress && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Uploading file {uploadProgress.current} of {uploadProgress.total}: <strong>{uploadProgress.fileName}</strong>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {/* Uploaded files (already in GCS) */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="text-sm font-semibold text-green-700">✓ Uploaded Files ({uploadedFiles.length})</h3>
              {uploadedFiles.map((uploadedFile, index) => (
                <Card key={`uploaded-${uploadedFile.fileId}`} className="border-green-200 bg-green-50/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        File #{uploadedFile.fileId}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">{uploadedFile.filetype}</span>
                    </div>
                    <CardDescription>
                      {uploadedFile.contextFields.brand} • {uploadedFile.contextFields.category}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Run Analysis</CardTitle>
          <CardDescription>
            Select files and focus to analyze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File selection */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <Label>Select Files and Prompts</Label>
              
              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-3">
                {uploadedFiles.map((uploadedFile) => {
                  const fileId = uploadedFile.fileId!;
                  const isSelected = selectedFileIds.has(fileId);
                  const selectedPromptId = filePromptSelections.get(fileId);
                  // Filter prompts by file type
                  const compatiblePrompts = availablePrompts?.prompts.filter(
                    (p: any) => p.filetype === uploadedFile.filetype
                  ) || [];
                  
                  return (
                    <div key={fileId} className="flex items-start gap-3 p-3 rounded border bg-card">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelection(fileId)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <div className="font-medium text-sm">File #{fileId}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {uploadedFile.contextFields.brand} • {uploadedFile.contextFields.category} • {uploadedFile.filetype}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Prompt:</span>
                          <Select
                            value={selectedPromptId || ''}
                            onValueChange={(promptId) => setFilePrompt(fileId, promptId)}
                            disabled={!isSelected}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select prompt..." />
                            </SelectTrigger>
                            <SelectContent>
                              {compatiblePrompts.map((prompt: any) => (
                                <SelectItem key={prompt.id} value={prompt.id}>
                                  {prompt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{selectedFileIds.size} of {uploadedFiles.length} files selected</span>
                <div className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={selectAllFiles}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllFiles}>
                    Deselect All
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || selectedFileIds.size === 0 || pendingFiles.length > 0}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Analysis on {selectedFileIds.size} File{selectedFileIds.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Click on each result to expand details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((result, index) => (
              <Card key={index} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors flex items-center justify-between"
                  onClick={() => toggleResultExpanded(index)}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold">{result.filename}</div>
                      {result.error && (
                        <div className="text-sm text-red-600">Error: {result.error}</div>
                      )}
                      {result.retryCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Retries: {result.retryCount}
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedResults.has(index) ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
                
                {expandedResults.has(index) && result.success && (
                  <div className="p-4 border-t bg-muted/30">
                    <ResultsDisplay 
                      data={result.result} 
                      schema={result.schema || {}} 
                    />
                  </div>
                )}
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
