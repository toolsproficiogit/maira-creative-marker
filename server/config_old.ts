import { Storage } from "@google-cloud/storage";
import { getGoogleCloudCredentials } from "./googleCloud";

let storageClient: Storage | null = null;

/**
 * Get or create GCS client
 */
function getStorageClient(): Storage {
  if (!storageClient) {
    const { projectId, credentials } = getGoogleCloudCredentials();
    storageClient = new Storage({
      projectId,
      credentials,
    });
  }
  return storageClient;
}

/**
 * Configuration structure
 */
export interface AppConfig {
  systemPrompts: {
    "image-branding": string;
    "image-performance": string;
    "video-branding": string;
    "video-performance": string;
  };
  outputSchemas: {
    "image-branding": { schema: Record<string, any>; tableName: string };
    "image-performance": { schema: Record<string, any>; tableName: string };
    "video-branding": { schema: Record<string, any>; tableName: string };
    "video-performance": { schema: Record<string, any>; tableName: string };
  };
  contextFields: Array<{
    name: string;
    label: string;
    required: boolean;
    type: "text" | "textarea";
  }>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AppConfig = {
  systemPrompts: {
    "image-branding": `You are an expert brand analyst. Analyze this image for branding effectiveness.

Context:
- Brand: {brand}
- Target Audience: {targetAudience}
- Category: {category}
- Primary Message: {primaryMessage}
- Secondary Messages: {secondaryMessage1}, {secondaryMessage2}

Evaluate:
1. Brand visibility and prominence
2. Message clarity and alignment
3. Visual appeal for target audience
4. Brand consistency

Return your analysis as JSON matching this structure:
{
  "brand_visibility_score": 1-10,
  "message_clarity_score": 1-10,
  "target_audience_fit_score": 1-10,
  "overall_branding_score": 1-10,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`,
    "image-performance": `You are a marketing performance analyst. Analyze this image for campaign performance potential.

Context:
- Brand: {brand}
- Target Audience: {targetAudience}
- Category: {category}
- Primary Message: {primaryMessage}
- Secondary Messages: {secondaryMessage1}, {secondaryMessage2}

Evaluate:
1. Call-to-action clarity
2. Engagement potential
3. Conversion likelihood
4. Performance metrics prediction

Return your analysis as JSON matching this structure:
{
  "cta_clarity_score": 1-10,
  "engagement_potential_score": 1-10,
  "conversion_likelihood_score": 1-10,
  "overall_performance_score": 1-10,
  "predicted_metrics": {
    "click_through_rate": "percentage estimate",
    "engagement_rate": "percentage estimate"
  },
  "optimization_suggestions": ["suggestion 1", "suggestion 2"]
}`,
    "video-branding": `You are an expert brand analyst. Analyze this video for branding effectiveness.

Context:
- Brand: {brand}
- Target Audience: {targetAudience}
- Category: {category}
- Primary Message: {primaryMessage}
- Secondary Messages: {secondaryMessage1}, {secondaryMessage2}

Evaluate:
1. Brand presence throughout video
2. Message delivery effectiveness
3. Emotional connection with target audience
4. Brand recall potential

Return your analysis as JSON matching this structure:
{
  "brand_presence_score": 1-10,
  "message_delivery_score": 1-10,
  "emotional_connection_score": 1-10,
  "brand_recall_score": 1-10,
  "overall_branding_score": 1-10,
  "key_moments": ["timestamp: observation"],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`,
    "video-performance": `# SYSTEM DIRECTIVE: VIDEO PERFORMANCE SPECIALIST

Jsi expert na krátká videa. Tvým úkolem je analyzovat video sekundu po sekundě a hledat místa poklesu pozornosti.

**KRITICKÉ:** Odpovídej POUZE ve formátu JSON podle přesně definované struktury. Nezačínej žádným úvodem ani vysvětlením. Generuj přímo JSON objekt.

## 1. ROZŠÍŘENÁ ZNALOSTNÍ BÁZE (Theoretical Framework)

Tvůj audit vychází z:
* **Platform Best Practices:** Google "ABCD Framework", Meta "Brilliant Basics", TikTok Creative Codes.
* **Attention Economy:** Karen Nelson-Field (Active Attention).
* **Distinctiveness:** Brand musí být rozpoznatelný i v rychlém feedu.
* **Neuro-Science:** Peak-End Rule.
* **Direct Response:** AIDA, FAB (Features-Advantages-Benefits).

## 2. VSTUPNÍ DATA PRO ANALÝZU

Analyzuj video na základě těchto kontextových informací:

* **Brand:** {brand}
* **Kategorie:** {category}
* **Cílová skupina (TA):** {targetAudience}
* **PRIMARY Message:** {primaryMessage}
* **SECONDARY Messages:** {secondaryMessage1}, {secondaryMessage2}

---

## STRUKTURA AUDITU

Analyzuj video podle následujících 4 sekcí a vygeneruj strukturovaný JSON výstup:

### SEKCE A: THE HOOK & DISTINCTIVENESS (0:00-0:03)
**Souhrn:** Schopnost okamžitě zaujmout (Stop Scroll) a zároveň identifikovat značku.

**Dílčí metriky k vyhodnocení:**
1. **Visceral Response:** Obsahuje úvod pohyb nebo vizuální "chybu", která zastaví palec?
2. **Brand Cues:** Je hned v úvodu jasné, od koho video je (barvy, produkt, logo, tvář značky)?
3. **Audio/Text Hook:** Je téma rámováno titulkem nebo zvukem hned v 1. vteřině?
4. **Relevance:** Není hook jen clickbait (slibuje něco, co video nesplní)?

**Výstup pro JSON:**
* \`hook_evidence_timestamp\`: Timestamp klíčového momentu (např. "0:00-0:03")
* \`hook_evidence_description\`: Popis úvodní scény
* \`hook_analysis\`: Hodnocení hooku a brandingu (2-3 věty)
* \`hook_score\`: Skóre 1-5

### SEKCE B: MESSAGE CLARITY & DEMO
**Souhrn:** Rychlost a názornost doručení hlavního benefitu (Speed to Value).

**Dílčí metriky k vyhodnocení:**
1. **Show, Don't Tell:** Je Primary Message vizualizována (Demo produktu)?
2. **Speed:** Dozví se divák "proč to chtít" v první třetině videa?
3. **Sound-Off:** Jsou zprávy čitelné i bez zvuku (titulky)?
4. **Secondary Support:** Nezahlcují vedlejší sdělení diváka?

**Výstup pro JSON:**
* \`message_evidence_timestamp\`: Timestamp doručení hlavního sdělení
* \`message_evidence_description\`: Popis momentu doručení value proposition
* \`message_analysis\`: Hodnocení srozumitelnosti a rychlosti (2-3 věty)
* \`message_score\`: Skóre 1-5

### SEKCE C: PACING & EDITING
**Souhrn:** Dynamika střihu a udržení pozornosti (Retention).

**Dílčí metriky k vyhodnocení:**
1. **Edit Frequency:** Mění se vizuál každé 2-4 sekundy?
2. **Visual Density:** Je video bohaté na B-roll a overlay prvky?
3. **Rhythm:** Sedí střih do hudby?
4. **Mobile Formatting:** Jsou prvky v "Safe Zones"?

**Výstup pro JSON:**
* \`pacing_evidence_timestamp\`: Timestamp nejslabší nebo nejsilnější pasáže
* \`pacing_evidence_description\`: Popis dynamiky střihu
* \`pacing_analysis\`: Hodnocení rytmu a editace (2-3 věty)
* \`pacing_score\`: Skóre 1-5

### SEKCE D: DIRECTION & CTA
**Souhrn:** Jasnost instrukce k dalšímu kroku.

**Dílčí metriky k vyhodnocení:**
1. **Explicitnost:** Je jasně řečeno/napsáno, co udělat?
2. **End Card:** Obsahuje konec grafické shrnutí a tlačítko?
3. **Urgency:** Motivuje konec k okamžité akci?
4. **Auditory CTA:** Je výzva i ve zvuku?

**Výstup pro JSON:**
* \`cta_evidence_timestamp\`: Timestamp nástupu CTA
* \`cta_evidence_description\`: Popis závěrečné výzvy
* \`cta_analysis\`: Hodnocení síly CTA (2-3 věty)
* \`cta_score\`: Skóre 1-5

---

## FINAL SCORECARD

Vypočítej celkové skóre podle vah:
* Hook/Distinctiveness: 30% váha
* Message Clarity: 30% váha
* Pacing/Editing: 20% váha
* CTA/Direction: 20% váha

**Výstup pro JSON:**
* \`hook_weighted_score\`: hook_score * 0.3
* \`message_weighted_score\`: message_score * 0.3
* \`pacing_weighted_score\`: pacing_score * 0.2
* \`cta_weighted_score\`: cta_score * 0.2
* \`total_score\`: Suma vážených skóre (max 5.0)
* \`total_percentage\`: (total_score / 5) * 100

* \`hook_verdict\`: Stručný komentář k Hook sekci (1 věta)
* \`message_verdict\`: Stručný komentář k Message sekci (1 věta)
* \`pacing_verdict\`: Stručný komentář k Pacing sekci (1 věta)
* \`cta_verdict\`: Stručný komentář k CTA sekci (1 věta)

---

## ACTION PLAN (Střižna)

Navrhni 3-4 konkrétní akční kroky pro optimalizaci:

**Výstup pro JSON:**
* \`action_plan\`: Array objektů, každý obsahuje:
  - \`action_title\`: Název akce (např. "Hook Optimization")
  - \`action_description\`: Konkrétní instrukce včetně timestampů
  - \`priority\`: "high" | "medium" | "low"

---

**PŘIPOMENUTÍ:** Vygeneruj POUZE validní JSON objekt podle definované struktury. Žádný markdown, žádný úvod, žádné vysvětlení mimo JSON.`,
  },
  outputSchemas: {
    "image-branding": {
      tableName: "image_branding_results_test",
      schema: {
        brand_visibility_score: { type: "integer" },
        message_clarity_score: { type: "integer" },
        target_audience_fit_score: { type: "integer" },
        overall_branding_score: { type: "integer" },
        strengths: { type: "array" },
        weaknesses: { type: "array" },
        recommendations: { type: "array" },
      },
    },
    "image-performance": {
      tableName: "image_performance_results_test",
      schema: {
        cta_clarity_score: { type: "integer" },
        engagement_potential_score: { type: "integer" },
        conversion_likelihood_score: { type: "integer" },
        overall_performance_score: { type: "integer" },
        predicted_metrics: { type: "object" },
        optimization_suggestions: { type: "array" },
      },
    },
    "video-branding": {
      tableName: "video_branding_results_test",
      schema: {
        brand_presence_score: { type: "integer" },
        message_delivery_score: { type: "integer" },
        emotional_connection_score: { type: "integer" },
        brand_recall_score: { type: "integer" },
        overall_branding_score: { type: "integer" },
        key_moments: { type: "array" },
        strengths: { type: "array" },
        weaknesses: { type: "array" },
        recommendations: { type: "array" },
      },
    },
    "video-performance": {
      tableName: "video_performance_analysis_test",
      schema: {"type":"object","properties":{"analysis_metadata":{"type":"object","properties":{"brand":{"type":"string","description":"Brand name from context"},"category":{"type":"string","description":"Product/service category"},"target_audience":{"type":"string","description":"Target audience description"},"primary_message":{"type":"string","description":"Primary message from context"},"secondary_messages":{"type":"array","items":{"type":"string"},"description":"Secondary messages from context"}},"required":["brand","category","target_audience","primary_message"],"additionalProperties":false},"section_a_hook":{"type":"object","properties":{"hook_evidence_timestamp":{"type":"string","description":"Timestamp of key moment (e.g., '0:00-0:03')"},"hook_evidence_description":{"type":"string","description":"Description of opening scene"},"hook_analysis":{"type":"string","description":"Evaluation of hook and branding (2-3 sentences in Czech)"},"hook_score":{"type":"integer","minimum":1,"maximum":5,"description":"Score 1-5"}},"required":["hook_evidence_timestamp","hook_evidence_description","hook_analysis","hook_score"],"additionalProperties":false},"section_b_message":{"type":"object","properties":{"message_evidence_timestamp":{"type":"string","description":"Timestamp of main message delivery"},"message_evidence_description":{"type":"string","description":"Description of value proposition moment"},"message_analysis":{"type":"string","description":"Evaluation of clarity and speed (2-3 sentences in Czech)"},"message_score":{"type":"integer","minimum":1,"maximum":5,"description":"Score 1-5"}},"required":["message_evidence_timestamp","message_evidence_description","message_analysis","message_score"],"additionalProperties":false},"section_c_pacing":{"type":"object","properties":{"pacing_evidence_timestamp":{"type":"string","description":"Timestamp of weakest or strongest passage"},"pacing_evidence_description":{"type":"string","description":"Description of editing dynamics"},"pacing_analysis":{"type":"string","description":"Evaluation of rhythm and editing (2-3 sentences in Czech)"},"pacing_score":{"type":"integer","minimum":1,"maximum":5,"description":"Score 1-5"}},"required":["pacing_evidence_timestamp","pacing_evidence_description","pacing_analysis","pacing_score"],"additionalProperties":false},"section_d_cta":{"type":"object","properties":{"cta_evidence_timestamp":{"type":"string","description":"Timestamp of CTA appearance"},"cta_evidence_description":{"type":"string","description":"Description of final call-to-action"},"cta_analysis":{"type":"string","description":"Evaluation of CTA strength (2-3 sentences in Czech)"},"cta_score":{"type":"integer","minimum":1,"maximum":5,"description":"Score 1-5"}},"required":["cta_evidence_timestamp","cta_evidence_description","cta_analysis","cta_score"],"additionalProperties":false},"final_scorecard":{"type":"object","properties":{"hook_weighted_score":{"type":"number","description":"hook_score * 0.3"},"message_weighted_score":{"type":"number","description":"message_score * 0.3"},"pacing_weighted_score":{"type":"number","description":"pacing_score * 0.2"},"cta_weighted_score":{"type":"number","description":"cta_score * 0.2"},"total_score":{"type":"number","minimum":0,"maximum":5,"description":"Sum of weighted scores (max 5.0)"},"total_percentage":{"type":"number","minimum":0,"maximum":100,"description":"(total_score / 5) * 100"},"hook_verdict":{"type":"string","description":"Brief comment on Hook section (1 sentence in Czech)"},"message_verdict":{"type":"string","description":"Brief comment on Message section (1 sentence in Czech)"},"pacing_verdict":{"type":"string","description":"Brief comment on Pacing section (1 sentence in Czech)"},"cta_verdict":{"type":"string","description":"Brief comment on CTA section (1 sentence in Czech)"}},"required":["hook_weighted_score","message_weighted_score","pacing_weighted_score","cta_weighted_score","total_score","total_percentage","hook_verdict","message_verdict","pacing_verdict","cta_verdict"],"additionalProperties":false},"action_plan":{"type":"array","items":{"type":"object","properties":{"action_title":{"type":"string","description":"Action name (e.g., 'Hook Optimization')"},"action_description":{"type":"string","description":"Specific instructions including timestamps (in Czech)"},"priority":{"type":"string","enum":["high","medium","low"],"description":"Priority level"}},"required":["action_title","action_description","priority"],"additionalProperties":false},"minItems":3,"maxItems":5,"description":"3-5 concrete action steps for optimization"}},"required":["analysis_metadata","section_a_hook","section_b_message","section_c_pacing","section_d_cta","final_scorecard","action_plan"],"additionalProperties":false},
    },
  },
  contextFields: [
    { name: "brand", label: "Brand", required: true, type: "text" },
    { name: "targetAudience", label: "Target Audience", required: true, type: "text" },
    { name: "category", label: "Category", required: true, type: "text" },
    { name: "primaryMessage", label: "Primary Message", required: true, type: "textarea" },
    { name: "secondaryMessage1", label: "Secondary Message 1", required: true, type: "textarea" },
    { name: "secondaryMessage2", label: "Secondary Message 2", required: true, type: "textarea" },
    { name: "version", label: "Version", required: false, type: "text" },
  ],
};

let cachedConfig: AppConfig | null = null;

/**
 * Load configuration from GCS or use default
 */
export async function loadConfig(bucketName: string, configFileName: string = "config.json"): Promise<AppConfig> {
  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(configFileName);

    const [exists] = await file.exists();
    
    if (!exists) {
      console.log("[Config] Config file not found in GCS, using defaults");
      cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }

    const [contents] = await file.download();
    const config = JSON.parse(contents.toString());
    
    cachedConfig = config;
    console.log("[Config] Loaded configuration from GCS");
    return config;
  } catch (error) {
    console.error("[Config] Error loading config from GCS:", error);
    cachedConfig = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to GCS
 */
export async function saveConfig(
  bucketName: string,
  config: AppConfig,
  configFileName: string = "config.json"
): Promise<void> {
  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(configFileName);

  await file.save(JSON.stringify(config, null, 2), {
    contentType: "application/json",
  });

  cachedConfig = config;
  console.log("[Config] Saved configuration to GCS");
}

/**
 * Get cached configuration
 */
export function getCachedConfig(): AppConfig {
  return cachedConfig || DEFAULT_CONFIG;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): AppConfig {
  return DEFAULT_CONFIG;
}
