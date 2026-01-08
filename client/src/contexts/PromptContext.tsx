/**
 * Prompt Management Context
 * 
 * Provides session-based caching of prompts loaded from GCS
 * Loads all prompts on mount, stores in React state
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import type { PromptConfig, PromptListItem } from "../../../shared/promptTypes";

interface PromptContextValue {
  /** All available prompts (list items) */
  prompts: PromptListItem[];
  
  /** Fully loaded prompts (with system prompt and schema) */
  loadedPrompts: Map<string, PromptConfig>;
  
  /** Whether prompts are being loaded */
  loading: boolean;
  
  /** Error message if loading failed */
  error: string | null;
  
  /** Data source (gcs, default, or fallback) */
  source: "gcs" | "default" | "fallback" | null;
  
  /** Refresh prompts from GCS */
  refresh: () => Promise<void>;
  
  /** Load a specific prompt (fetches if not already loaded) */
  loadPrompt: (promptId: string) => Promise<PromptConfig | null>;
  
  /** Get a loaded prompt from cache */
  getPrompt: (promptId: string) => PromptConfig | null;
  
  /** Update a prompt in cache (after edit) */
  updatePromptInCache: (prompt: PromptConfig) => void;
  
  /** Remove a prompt from cache (after delete) */
  removePromptFromCache: (promptId: string) => void;
}

const PromptContext = createContext<PromptContextValue | null>(null);

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [loadedPrompts, setLoadedPrompts] = useState<Map<string, PromptConfig>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"gcs" | "default" | "fallback" | null>(null);
  
  const listQuery = trpc.prompts.list.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  const utils = trpc.useUtils();
  
  // Load prompts on mount
  useEffect(() => {
    if (listQuery.data) {
      setPrompts(listQuery.data.prompts);
      setSource(listQuery.data.source);
      setLoading(false);
      setError(null);
    } else if (listQuery.error) {
      setError(listQuery.error.message);
      setLoading(false);
    }
  }, [listQuery.data, listQuery.error]);
  
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await listQuery.refetch();
  }, [listQuery]);
  
  const loadPrompt = useCallback(async (promptId: string): Promise<PromptConfig | null> => {
    // Check cache first
    const cached = loadedPrompts.get(promptId);
    if (cached) {
      return cached;
    }
    
    // Fetch from server
    try {
      const result = await utils.prompts.get.fetch({ promptId });
      const prompt = result.prompt;
      
      // Update cache
      setLoadedPrompts((prev) => new Map(prev).set(promptId, prompt));
      
      return prompt;
    } catch (error) {
      console.error(`[PromptContext] Failed to load prompt ${promptId}:`, error);
      return null;
    }
  }, [loadedPrompts, utils]);
  
  const getPrompt = useCallback((promptId: string): PromptConfig | null => {
    return loadedPrompts.get(promptId) || null;
  }, [loadedPrompts]);
  
  const updatePromptInCache = useCallback((prompt: PromptConfig) => {
    setLoadedPrompts((prev) => new Map(prev).set(prompt.id, prompt));
    
    // Also update in list
    setPrompts((prev) => {
      const index = prev.findIndex((p) => p.id === prompt.id);
      if (index >= 0) {
        const newPrompts = [...prev];
        const { systemPrompt, outputSchema, ...listItem } = prompt;
        newPrompts[index] = listItem;
        return newPrompts;
      } else {
        const { systemPrompt, outputSchema, ...listItem } = prompt;
        return [...prev, listItem];
      }
    });
  }, []);
  
  const removePromptFromCache = useCallback((promptId: string) => {
    setLoadedPrompts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(promptId);
      return newMap;
    });
    
    setPrompts((prev) => prev.filter((p) => p.id !== promptId));
  }, []);
  
  const value: PromptContextValue = {
    prompts,
    loadedPrompts,
    loading,
    error,
    source,
    refresh,
    loadPrompt,
    getPrompt,
    updatePromptInCache,
    removePromptFromCache,
  };
  
  return <PromptContext.Provider value={value}>{children}</PromptContext.Provider>;
}

export function usePrompts() {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error("usePrompts must be used within PromptProvider");
  }
  return context;
}
