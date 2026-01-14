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
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const updateContextField = (index: number, field: string, value: string) => {
    const updated = [...uploadedFiles];
    updated[index].contextFields = {
      ...updated[index].contextFields,
      [field]: value,
    };
    setUploadedFiles(updated);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (!sessionId) {
      toast.error("No active session");
      return;
    }

    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadedFile = uploadedFiles[i];
      
      if (uploadedFile.fileId) continue; // Already uploaded

      try {
        // Step 1: Generate signed upload URL
        const urlData = await generateUploadUrlMutation.mutateAsync({
          sessionId,
          filename: uploadedFile.file.name,
          contentType: uploadedFile.file.type,
        });

        // Step 2: Upload file directly to GCS using signed URL
        const uploadResponse = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": uploadedFile.file.type,
          },
          body: uploadedFile.file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`GCS upload failed: ${uploadResponse.statusText}`);
        }

        // Step 3: Create file metadata record
        const metadata = await uploadFileMutation.mutateAsync({
          sessionId,
          filename: uploadedFile.file.name,
          mimeType: uploadedFile.file.type,
          fileSize: uploadedFile.file.size,
          contextFields: uploadedFile.contextFields,
        });

        // Step 4: Update file record with public URL
        await updateFileUrlMutation.mutateAsync({
          fileId: metadata.fileId,
          fileUrl: urlData.publicUrl,
        });

        // Update UI
        const updated = [...uploadedFiles];
        updated[i].fileId = metadata.fileId;
        updated[i].filetype = metadata.filetype;
        setUploadedFiles(updated);

        toast.success(`Uploaded: ${uploadedFile.file.name}`);
      } catch (error: any) {
        toast.error(`Failed to upload ${uploadedFile.file.name}: ${error.message}`);
      }
    }
  };

  const handleRunAnalysis = async () => {
    if (!sessionId) {
      toast.error("No active session");
      return;
    }

    const allUploaded = uploadedFiles.every((f) => f.fileId);
    if (!allUploaded) {
      toast.error("Please upload all files first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await runAnalysisMutation.mutateAsync({
        sessionId,
        focus,
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
            <ul className="list-disc list-inside space-y-1 text-sm">
              {value.map((item, idx) => (
                <li key={idx}>{String(item)}</li>
              ))}
            </ul>
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

          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              {uploadedFiles.map((uploadedFile, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {uploadedFile.file.name}
                        {uploadedFile.fileId && (
                          <CheckCircle2 className="inline-block ml-2 h-4 w-4 text-green-600" />
                        )}
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
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                      {uploadedFile.filetype && ` • ${uploadedFile.filetype}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {configData?.contextFields.map((field) => (
                      <div key={field.name}>
                        <Label htmlFor={`${index}-${field.name}`}>
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            id={`${index}-${field.name}`}
                            value={uploadedFile.contextFields[field.name as keyof typeof uploadedFile.contextFields] || ""}
                            onChange={(e) => updateContextField(index, field.name, e.target.value)}
                            required={field.required}
                          />
                        ) : (
                          <Input
                            id={`${index}-${field.name}`}
                            value={uploadedFile.contextFields[field.name as keyof typeof uploadedFile.contextFields] || ""}
                            onChange={(e) => updateContextField(index, field.name, e.target.value)}
                            required={field.required}
                          />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              <Button onClick={handleUploadAll} disabled={!sessionId} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Upload All Files
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Run Analysis</CardTitle>
          <CardDescription>
            Select focus and analyze all uploaded files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            disabled={isAnalyzing || uploadedFiles.length === 0 || !uploadedFiles.every((f) => f.fileId)}
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
                Run Analysis
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
