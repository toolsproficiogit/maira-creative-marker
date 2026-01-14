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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [focus, setFocus] = useState<"branding" | "performance">("branding");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

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



  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
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

    setIsAnalyzing(true);
    try {
      const result = await runAnalysisMutation.mutateAsync({
        sessionId,
        focus,
        fileIds: Array.from(selectedFileIds),
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

  const formatResultData = (data: any) => {
    if (!data) return null;

    return Object.entries(data).map(([key, value]) => {
      const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      
      if (Array.isArray(value)) {
        return (
          <div key={key} className="mb-3">
            <div className="font-semibold text-sm mb-1">{formattedKey}:</div>
            {value.length > 0 && typeof value[0] === "object" && value[0] !== null ? (
              // Array of objects - display as structured list
              <div className="space-y-2 pl-4">
                {value.map((item, idx) => (
                  <div key={idx} className="border-l-2 border-gray-300 pl-3 py-1">
                    <div className="font-medium text-xs text-muted-foreground mb-1">Item {idx + 1}</div>
                    {Object.entries(item).map(([subKey, subValue]) => (
                      <div key={subKey} className="text-sm">
                        <span className="font-medium">{subKey.replace(/_/g, " ")}:</span>{" "}
                        {String(subValue)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              // Array of primitives - display as list
              <ul className="list-disc list-inside space-y-1 text-sm">
                {value.map((item, idx) => (
                  <li key={idx}>{String(item)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      } else if (typeof value === "object" && value !== null) {
        return (
          <div key={key} className="mb-3">
            <div className="font-semibold text-sm mb-1">{formattedKey}:</div>
            <div className="pl-4 space-y-1 text-sm">
              {Object.entries(value).map(([subKey, subValue]) => (
                <div key={subKey}>
                  <span className="font-medium">{subKey.replace(/_/g, " ")}:</span>{" "}
                  {String(subValue)}
                </div>
              ))}
            </div>
          </div>
        );
      } else {
        return (
          <div key={key} className="mb-2 text-sm">
            <span className="font-semibold">{formattedKey}:</span> {String(value)}
          </div>
        );
      }
    });
  };

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
          <div>
            <Input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              disabled={!sessionId}
            />
          </div>

          {/* Pending files (not yet uploaded) */}
          {pendingFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Pending Upload</h3>
              {pendingFiles.map((pendingFile, index) => (
                <Card key={`pending-${index}`} className="border-orange-200 bg-orange-50/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {pendingFile.file.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <CardDescription>
                      {(pendingFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </CardDescription>
                  </CardHeader>
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
                </Card>
              ))}

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
              <div className="flex items-center justify-between">
                <Label>Select Files to Analyze</Label>
                <div className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={selectAllFiles}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllFiles}>
                    Deselect All
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {uploadedFiles.map((uploadedFile) => (
                  <label
                    key={uploadedFile.fileId}
                    className="flex items-start gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFileIds.has(uploadedFile.fileId!)}
                      onChange={() => toggleFileSelection(uploadedFile.fileId!)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">File #{uploadedFile.fileId}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {uploadedFile.contextFields.brand} • {uploadedFile.contextFields.category} • {uploadedFile.filetype}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="text-sm text-muted-foreground">
                {selectedFileIds.size} of {uploadedFiles.length} files selected
              </div>
            </div>
          )}
          
          <div>
            <Label htmlFor="focus">Analysis Focus</Label>
            <Select value={focus} onValueChange={(v: any) => setFocus(v)}>
              <SelectTrigger id="focus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="branding">Branding</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                    {formatResultData(result.result)}
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
