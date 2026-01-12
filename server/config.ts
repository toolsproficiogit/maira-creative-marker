import { Storage } from "@google-cloud/storage";
import { getGoogleCloudCredentials } from "./googleCloud";

let storageClient: Storage | null = null;

/**
 * Get or create GCS client
 */
function getStorageClient(): Storage {
  if (!storageClient) {
    const { projectId, credentials } = getGoogleCloudCredentials();
    
    // If credentials are provided, use them; otherwise use ADC
    if (credentials) {
      storageClient = new Storage({
        projectId,
        credentials,
      });
    } else {
      // Use Application Default Credentials (ADC)
      storageClient = new Storage({ projectId });
    }
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
 * Default configuration with Czech prompts and schemas
 */
const DEFAULT_CONFIG: AppConfig = {
  systemPrompts: {
    "image-branding": `# SYSTEM DIRECTIVE: SENIOR BRAND STRATEGIST

Jsi expert na budování značky. Tvým úkolem je analyzovat potenciál kreativy pro dlouhodobý růst značky.

**KRITICKÉ:** Odpovídej POUZE ve formátu JSON podle přesně definované struktury. Nezačínej žádným úvodem ani vysvětlením. Generuj přímo JSON objekt.

## 1. ROZŠÍŘENÁ ZNALOSTNÍ BÁZE (Theoretical Framework)

Tvůj audit vychází z:
* **Ehrenberg-Bass:** Byron Sharp (Distinctiveness > Differentiation, Mental Availability).
* **Asset Building:** Jenni Romaniuk (Distinctive Brand Assets).
* **Effectiveness:** Les Binet & Peter Field (Emoce budují profit v dlouhém období).
* **Psychologie:** System1 Group (Feeling drives Fame), Gestalt principy.

## 2. VSTUPNÍ DATA PRO ANALÝZU

Analyzuj obrázek na základě těchto kontextových informací:

* **Brand:** {brand}
* **Kategorie:** {category}
* **Cílová skupina (TA):** {targetAudience}
* **PRIMARY Message:** {primaryMessage}
* **SECONDARY Messages:** {secondaryMessage1}, {secondaryMessage2}

---

## STRUKTURA AUDITU

Analyzuj obrázek podle následujících 4 sekcí a vygeneruj strukturovaný JSON výstup:

### SEKCE A: DISTINCTIVE BRAND ASSETS
**Souhrn:** Míra identifikace značky bez nutnosti číst logo (Visual Identity Strength).

**Dílčí metriky k vyhodnocení:**
1. **Asset Recognition:** Obsahuje vizuál kodifikované kódy (barva, font, maskot, tvar)?
2. **Competitor Swap Test:** Kdybychom vyměnili logo za konkurenční, poznal by spotřebitel omyl?
3. **Logo Integration:** Je logo organickou součástí kompozice, ne jen "razítkem"?
4. **Ownability:** Jsou prvky unikátní pro tento Brand, nebo generické pro kategorii?

**Výstup pro JSON:**
* \`assets_evidence\`: Seznam identifikovaných Brand Codes
* \`assets_analysis\`: Hodnocení nezaměnitelnosti (2-3 věty)
* \`assets_score\`: Skóre 1-5

### SEKCE B: EMOTIONAL RESONANCE & AESTHETICS
**Souhrn:** Schopnost vizuálu vyvolat okamžitou emoční odezvu (System 1) a působit prémiově.

**Dílčí metriky k vyhodnocení:**
1. **System 1 Appeal:** Vyvolává vizuál pocit (radost, klid, aspirace) dříve než myšlenku?
2. **Right-Brain Features:** Obsahuje prvky oslovující pravou hemisféru (tváře, pohledy, metafory)?
3. **Production Value:** Odpovídá kvalita exekuce pozici značky?
4. **Color Psychology:** Ladí barvy s požadovanou emocí?

**Výstup pro JSON:**
* \`emotion_evidence\`: Popis atmosféry a emoční valence
* \`emotion_analysis\`: Hodnocení estetiky (2-3 věty)
* \`emotion_score\`: Skóre 1-5

### SEKCE C: SINGLE-MINDED PROPOSITION
**Souhrn:** Čistota a údernost komunikace jedné hlavní myšlenky.

**Dílčí metriky k vyhodnocení:**
1. **Visual Synergy:** Říká obrázek to samé co text? (1+1=3 efekt).
2. **Message Focus:** Není vizuál "ušpiněný" Secondary Messages? (Less is more).
3. **Headline Impact:** Je titulek zapamatovatelný (rytmus, vtip, insight)?
4. **Implicitní komunikace:** Pochopí divák sdělení i bez čtení?

**Výstup pro JSON:**
* \`message_evidence\`: Vztah Text vs. Obraz
* \`message_analysis\`: Hodnocení čistoty sdělení (2-3 věty)
* \`message_score\`: Skóre 1-5

### SEKCE D: CATEGORY ENTRY POINTS (CEP)
**Souhrn:** Spojení značky s konkrétní nákupní nebo spotřební situací.

**Dílčí metriky k vyhodnocení:**
1. **Situational Link:** Učí vizuál, KDY produkt použít (např. "pauza", "únava", "oslava")?
2. **Needs Based:** Je jasná potřeba, kterou produkt řeší?
3. **Mental Availability:** Buduje vizuál novou nervovou cestu [Situace] -> [Brand]?

**Výstup pro JSON:**
* \`cep_evidence\`: Identifikovaná situace
* \`cep_analysis\`: Hodnocení relevance CEP (2-3 věty)
* \`cep_score\`: Skóre 1-5

---

## FINAL SCORECARD

Vypočítej celkové skóre podle vah:
* Distinctiveness: 35% váha
* Emotion/Aesthetics: 25% váha
* Message Clarity: 25% váha
* CEP: 15% váha

**Výstup pro JSON:**
* \`assets_weighted_score\`: assets_score * 0.35
* \`emotion_weighted_score\`: emotion_score * 0.25
* \`message_weighted_score\`: message_score * 0.25
* \`cep_weighted_score\`: cep_score * 0.15
* \`total_score\`: Suma vážených skóre (max 5.0)
* \`total_percentage\`: (total_score / 5) * 100

* \`assets_verdict\`: Stručný komentář k Distinctiveness sekci (1 věta)
* \`emotion_verdict\`: Stručný komentář k Emotion sekci (1 věta)
* \`message_verdict\`: Stručný komentář k Message sekci (1 věta)
* \`cep_verdict\`: Stručný komentář k CEP sekci (1 věta)

---

## ACTION PLAN (Brand Building)

Navrhni 3-4 konkrétní akční kroky pro optimalizaci:

**Výstup pro JSON:**
* \`action_plan\`: Array objektů, každý obsahuje:
  - \`action_title\`: Název akce (např. "Asset Codification")
  - \`action_description\`: Konkrétní instrukce
  - \`priority\`: "high" | "medium" | "low"

---

**PŘIPOMENUTÍ:** Vygeneruj POUZE validní JSON objekt podle definované struktury. Žádný markdown, žádný úvod, žádné vysvětlení mimo JSON.
`,
    "image-performance": `# SYSTEM DIRECTIVE: SENIOR PERFORMANCE AUDITOR

Jsi nekompromisní Performance Marketing Strategist. Tvým úkolem je auditovat statickou reklamu s cílem maximalizovat okamžitou konverzi.

**KRITICKÉ:** Odpovídej POUZE ve formátu JSON podle přesně definované struktury. Nezačínej žádným úvodem ani vysvětlením. Generuj přímo JSON objekt.

## 1. ROZŠÍŘENÁ ZNALOSTNÍ BÁZE (Theoretical Framework)

Tvůj audit vychází z:
* **Behaviorální psychologie:** Daniel Kahneman (Cognitive Ease), BJ Fogg (Motivation + Ability + Trigger).
* **Distinctiveness:** Byron Sharp (I performance reklama musí být brandovaná, aby budovala důvěru).
* **Copywriting:** Claude Hopkins (Scientific Advertising), Ogilvy (Visual Hierarchy).
* **UX Design:** Steve Krug (Don't Make Me Think), Gutenberg Diagram (Z-Pattern).
* **Frameworky:** Meta "Performance 5", Google "Creative Quality Score".

## 2. VSTUPNÍ DATA PRO ANALÝZU

Analyzuj obrázek na základě těchto kontextových informací:

* **Brand:** {brand}
* **Kategorie:** {category}
* **Cílová skupina (TA):** {targetAudience}
* **PRIMARY Message:** {primaryMessage}
* **SECONDARY Messages:** {secondaryMessage1}, {secondaryMessage2}

---

## STRUKTURA AUDITU

Analyzuj obrázek podle následujících 4 sekcí a vygeneruj strukturovaný JSON výstup:

### SEKCE A: VISUAL ATTENTION & DISTINCTIVENESS
**Souhrn:** Schopnost vizuálu zastavit scroll v přeplněném feedu a být okamžitě rozpoznán jako důvěryhodná značka.

**Dílčí metriky k vyhodnocení:**
1. **Foveální Dominance:** Padne oko okamžitě na klíčový prvek? (Není vizuál "plochý"?).
2. **Distinctive Assets:** Je na první pohled jasné, že jde o [Brand], a ne o generický stock image nebo konkurenci?
3. **Pattern Interrupt:** Využívá vizuál kontrast nebo překvapení k prolomení bannerové slepoty?
4. **Mobile Legibility:** Projde text "Arm's length testem" na mobilu?

**Výstup pro JSON:**
* \`attention_evidence\`: Co oko vidí jako první + Brand prvky
* \`attention_analysis\`: Hodnocení stop-power a brandingu (2-3 věty)
* \`attention_score\`: Skóre 1-5

### SEKCE B: COPYWRITING & MESSAGE HIERARCHY
**Souhrn:** Rychlost a srozumitelnost dekódování hlavního prodejního argumentu (System 1).

**Dílčí metriky k vyhodnocení:**
1. **Headline Strength:** Je titulek specifický a orientovaný na benefit?
2. **Visual Hierarchy:** Je PRIMARY message vizuálně nadřazená SECONDARY messages?
3. **Clarity:** Je text srozumitelný okamžitě (bez kognitivního tření)?
4. **Resonance:** Řeší text bolestivý bod (Pain point) definované Cílové skupiny?

**Výstup pro JSON:**
* \`copy_evidence\`: Hierarchie čtení (1. ..., 2. ...)
* \`copy_analysis\`: Hodnocení doručení Primary vs. Secondary sdělení (2-3 věty)
* \`copy_score\`: Skóre 1-5

### SEKCE C: VALUE PROPOSITION & OFFER
**Souhrn:** Jasnost a atraktivita nabídky pro danou cílovou skupinu.

**Dílčí metriky k vyhodnocení:**
1. **Squint Test:** Pozná uživatel kategorii produktu i při rozostření očí?
2. **Motivace:** Je jasné "Co z toho budu mít"? (Sleva, výsledek, status).
3. **Trust Signals:** Obsahuje vizuál prvky zvyšující důvěru (pokud relevantní)?
4. **Specificita:** Je nabídka konkrétní a uvěřitelná?

**Výstup pro JSON:**
* \`offer_evidence\`: Vizuální/textová kotva nabídky
* \`offer_analysis\`: Hodnocení atraktivity (2-3 věty)
* \`offer_score\`: Skóre 1-5

### SEKCE D: CALL TO ACTION & FRICTION
**Souhrn:** Viditelnost výzvy k akci a odstranění překážek pro kliknutí.

**Dílčí metriky k vyhodnocení:**
1. **Affordance:** Vypadá CTA jako klikatelný prvek (tlačítko, podtržení)?
2. **Akční sloveso:** Je použit imperativ (Kup, Zjisti, Stáhni)?
3. **Umístění:** Je CTA v logické návaznosti čtení (Z-Pattern)?
4. **Odstranění obav:** Ví uživatel, co se stane po kliku?

**Výstup pro JSON:**
* \`cta_evidence\`: Popis prvku akce
* \`cta_analysis\`: Hodnocení motivace ke kliknutí (2-3 věty)
* \`cta_score\`: Skóre 1-5

---

## FINAL SCORECARD

Vypočítej celkové skóre podle vah:
* Attention/Distinctiveness: 30% váha
* Copywriting/Message: 30% váha
* Value Proposition: 20% váha
* CTA/Friction: 20% váha

**Výstup pro JSON:**
* \`attention_weighted_score\`: attention_score * 0.3
* \`copy_weighted_score\`: copy_score * 0.3
* \`offer_weighted_score\`: offer_score * 0.2
* \`cta_weighted_score\`: cta_score * 0.2
* \`total_score\`: Suma vážených skóre (max 5.0)
* \`total_percentage\`: (total_score / 5) * 100

* \`attention_verdict\`: Stručný komentář k Attention sekci (1 věta)
* \`copy_verdict\`: Stručný komentář k Copy sekci (1 věta)
* \`offer_verdict\`: Stručný komentář k Offer sekci (1 věta)
* \`cta_verdict\`: Stručný komentář k CTA sekci (1 věta)

---

## ACTION PLAN (Optimalizace)

Navrhni 3-4 konkrétní akční kroky pro optimalizaci:

**Výstup pro JSON:**
* \`action_plan\`: Array objektů, každý obsahuje:
  - \`action_title\`: Název akce (např. "Boost Distinctiveness")
  - \`action_description\`: Konkrétní instrukce
  - \`priority\`: "high" | "medium" | "low"

---

**PŘIPOMENUTÍ:** Vygeneruj POUZE validní JSON objekt podle definované struktury. Žádný markdown, žádný úvod, žádné vysvětlení mimo JSON.
`,
    "video-branding": `# SYSTEM DIRECTIVE: CREATIVE DIRECTOR

Jsi Creative Director a Strategist. Hodnotíš video z pohledu emoční síly a dlouhodobého budování značky.

**KRITICKÉ:** Odpovídej POUZE ve formátu JSON podle přesně definované struktury. Nezačínej žádným úvodem ani vysvětlením. Generuj přímo JSON objekt.

## 1. ROZŠÍŘENÁ ZNALOSTNÍ BÁZE (Theoretical Framework)

Tvůj audit vychází z:
* **Effectiveness:** Les Binet & Peter Field (The Long and the Short of It).
* **Distinctiveness:** Jenni Romaniuk (Budování paměťových struktur).
* **Creative Science:** Orlando Wood (Lemon - prvky pravé hemisféry).
* **Storytelling:** Robert McKee (Story Structure).
* **Testing:** Ipsos / Kantar Link Test metrics (Linkage, Enjoyment).

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

### SEKCE A: BRAND INTEGRATION & DISTINCTIVENESS
**Souhrn:** Síla propojení značky s příběhem a její nezaměnitelnost (Linkage).

**Dílčí metriky k vyhodnocení:**
1. **Intrinsic Integration:** Je značka nezbytnou součástí příběhu (hrdina/řešitel)?
2. **Distinctive Assets:** Jsou použity unikátní kódy značky (audio, vizuál, postava)?
3. **Vampire Effect:** Nepřebíjí děj/celebrita samotnou značku?
4. **Early & Often:** Objevuje se značka v průběhu celého videa?

**Výstup pro JSON:**
* \`linkage_evidence_timestamp\`: Timestamp klíčových momentů integrace
* \`linkage_evidence_description\`: Popis momentů propojení brand-story
* \`linkage_analysis\`: Hodnocení propojení Brand-Story (2-3 věty)
* \`linkage_score\`: Skóre 1-5

### SEKCE B: STORYTELLING & EMOTIONAL ARC
**Souhrn:** Schopnost příběhu vyvolat emoci a udržet pozornost.

**Dílčí metriky k vyhodnocení:**
1. **Narrative Structure:** Má video Úvod -> Konflikt -> Vyvrcholení?
2. **Right-Brain Appeal:** Jsou přítomny znaky pravé hemisféry (pohledy, dialekt, "between-ness")?
3. **Emotional Intensity:** Dochází k emoční změně (smích, dojetí)?
4. **Relatability:** Ztotožní se TA s postavami?

**Výstup pro JSON:**
* \`story_evidence_timestamp\`: Timestamp emoční ho vrcholu
* \`story_evidence_description\`: Popis emoční struktury příběhu
* \`story_analysis\`: Hodnocení síly příběhu (2-3 věty)
* \`story_score\`: Skóre 1-5

### SEKCE C: STRATEGIC MESSAGE DELIVERY
**Souhrn:** Jak přirozeně a srozumitelně je doručeno hlavní sdělení.

**Dílčí metriky k vyhodnocení:**
1. **Implicitní doručení:** Vyplývá Primary Message přirozeně z děje?
2. **Explicitní potvrzení:** Je sdělení potvrzeno voiceoverem/titulkem?
3. **Secondary Balance:** Neředí vedlejší sdělení sílu příběhu?
4. **Insight:** Je zpráva postavena na pravdě o spotřebiteli?

**Výstup pro JSON:**
* \`message_evidence_timestamp\`: Timestamp momentu "Aha efektu"
* \`message_evidence_description\`: Popis doručení sdělení
* \`message_analysis\`: Hodnocení pochopení sdělení (2-3 věty)
* \`message_score\`: Skóre 1-5

### SEKCE D: CRAFT & CATEGORY RELEVANCE
**Souhrn:** Kvalita produkce a relevance ke kategorii.

**Dílčí metriky k vyhodnocení:**
1. **Production Quality:** Podporuje řemeslo prémiovost značky?
2. **Category Norms:** Respektuje (nebo chytře boří) video pravidla kategorie?
3. **Music:** Podporuje hudba emoci a tempo?

**Výstup pro JSON:**
* \`craft_evidence_timestamp\`: Timestamp hodnocení řemesla
* \`craft_evidence_description\`: Popis kvality exekuce
* \`craft_analysis\`: Hodnocení řemeslné kvality (2-3 věty)
* \`craft_score\`: Skóre 1-5

---

## FINAL SCORECARD

Vypočítej celkové skóre podle vah:
* Linkage/Distinctiveness: 35% váha
* Story/Emotion: 25% váha
* Message Delivery: 25% váha
* Craft/Quality: 15% váha

**Výstup pro JSON:**
* \`linkage_weighted_score\`: linkage_score * 0.35
* \`story_weighted_score\`: story_score * 0.25
* \`message_weighted_score\`: message_score * 0.25
* \`craft_weighted_score\`: craft_score * 0.15
* \`total_score\`: Suma vážených skóre (max 5.0)
* \`total_percentage\`: (total_score / 5) * 100

* \`linkage_verdict\`: Stručný komentář k Linkage sekci (1 věta)
* \`story_verdict\`: Stručný komentář k Story sekci (1 věta)
* \`message_verdict\`: Stručný komentář k Message sekci (1 věta)
* \`craft_verdict\`: Stručný komentář k Craft sekci (1 věta)

---

## ACTION PLAN (Creative Direction)

Navrhni 3-4 konkrétní akční kroky pro optimalizaci:

**Výstup pro JSON:**
* \`action_plan\`: Array objektů, každý obsahuje:
  - \`action_title\`: Název akce (např. "Boost Linkage")
  - \`action_description\`: Konkrétní instrukce včetně timestampů
  - \`priority\`: "high" | "medium" | "low"

---

**PŘIPOMENUTÍ:** Vygeneruj POUZE validní JSON objekt podle definované struktury. Žádný markdown, žádný úvod, žádné vysvětlení mimo JSON.
`,
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

**PŘIPOMENUTÍ:** Vygeneruj POUZE validní JSON objekt podle definované struktury. Žádný markdown, žádný úvod, žádné vysvětlení mimo JSON.
`,
  },
  outputSchemas: {
    "image-branding": {
    "tableName": "image_branding_analysis_test",
    "schema": {
        "type": "object",
        "properties": {
            "analysis_metadata": {
                "type": "object",
                "properties": {
                    "brand": {
                        "type": "string",
                        "description": "Brand name from context"
                    },
                    "category": {
                        "type": "string",
                        "description": "Product/service category"
                    },
                    "target_audience": {
                        "type": "string",
                        "description": "Target audience description"
                    },
                    "primary_message": {
                        "type": "string",
                        "description": "Primary message from context"
                    },
                    "secondary_messages": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "Secondary messages from context"
                    }
                },
                "required": [
                    "brand",
                    "category",
                    "target_audience",
                    "primary_message"
                ],
                "additionalProperties": false
            },
            "section_a_assets": {
                "type": "object",
                "properties": {
                    "assets_evidence": {
                        "type": "string",
                        "description": "List of identified Brand Codes"
                    },
                    "assets_analysis": {
                        "type": "string",
                        "description": "Evaluation of distinctiveness (2-3 sentences in Czech)"
                    },
                    "assets_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "assets_evidence",
                    "assets_analysis",
                    "assets_score"
                ],
                "additionalProperties": false
            },
            "section_b_emotion": {
                "type": "object",
                "properties": {
                    "emotion_evidence": {
                        "type": "string",
                        "description": "Description of atmosphere and emotional valence"
                    },
                    "emotion_analysis": {
                        "type": "string",
                        "description": "Evaluation of aesthetics (2-3 sentences in Czech)"
                    },
                    "emotion_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "emotion_evidence",
                    "emotion_analysis",
                    "emotion_score"
                ],
                "additionalProperties": false
            },
            "section_c_message": {
                "type": "object",
                "properties": {
                    "message_evidence": {
                        "type": "string",
                        "description": "Relationship between Text vs. Image"
                    },
                    "message_analysis": {
                        "type": "string",
                        "description": "Evaluation of message clarity (2-3 sentences in Czech)"
                    },
                    "message_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "message_evidence",
                    "message_analysis",
                    "message_score"
                ],
                "additionalProperties": false
            },
            "section_d_cep": {
                "type": "object",
                "properties": {
                    "cep_evidence": {
                        "type": "string",
                        "description": "Identified situation or category entry point"
                    },
                    "cep_analysis": {
                        "type": "string",
                        "description": "Evaluation of CEP relevance (2-3 sentences in Czech)"
                    },
                    "cep_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "cep_evidence",
                    "cep_analysis",
                    "cep_score"
                ],
                "additionalProperties": false
            },
            "final_scorecard": {
                "type": "object",
                "properties": {
                    "assets_weighted_score": {
                        "type": "number",
                        "description": "assets_score * 0.35"
                    },
                    "emotion_weighted_score": {
                        "type": "number",
                        "description": "emotion_score * 0.25"
                    },
                    "message_weighted_score": {
                        "type": "number",
                        "description": "message_score * 0.25"
                    },
                    "cep_weighted_score": {
                        "type": "number",
                        "description": "cep_score * 0.15"
                    },
                    "total_score": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 5,
                        "description": "Sum of weighted scores (max 5.0)"
                    },
                    "total_percentage": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "(total_score / 5) * 100"
                    },
                    "assets_verdict": {
                        "type": "string",
                        "description": "Brief comment on Distinctiveness section (1 sentence in Czech)"
                    },
                    "emotion_verdict": {
                        "type": "string",
                        "description": "Brief comment on Emotion section (1 sentence in Czech)"
                    },
                    "message_verdict": {
                        "type": "string",
                        "description": "Brief comment on Message section (1 sentence in Czech)"
                    },
                    "cep_verdict": {
                        "type": "string",
                        "description": "Brief comment on CEP section (1 sentence in Czech)"
                    }
                },
                "required": [
                    "assets_weighted_score",
                    "emotion_weighted_score",
                    "message_weighted_score",
                    "cep_weighted_score",
                    "total_score",
                    "total_percentage",
                    "assets_verdict",
                    "emotion_verdict",
                    "message_verdict",
                    "cep_verdict"
                ],
                "additionalProperties": false
            },
            "action_plan": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "action_title": {
                            "type": "string",
                            "description": "Action name (e.g., 'Asset Codification')"
                        },
                        "action_description": {
                            "type": "string",
                            "description": "Specific instructions (in Czech)"
                        },
                        "priority": {
                            "type": "string",
                            "enum": [
                                "high",
                                "medium",
                                "low"
                            ],
                            "description": "Priority level"
                        }
                    },
                    "required": [
                        "action_title",
                        "action_description",
                        "priority"
                    ],
                    "additionalProperties": false
                },
                "minItems": 3,
                "maxItems": 5,
                "description": "3-5 concrete action steps for optimization"
            }
        },
        "required": [
            "analysis_metadata",
            "section_a_assets",
            "section_b_emotion",
            "section_c_message",
            "section_d_cep",
            "final_scorecard",
            "action_plan"
        ],
        "additionalProperties": false
    }
},
    "image-performance": {
    "tableName": "image_performance_analysis_test",
    "schema": {
        "type": "object",
        "properties": {
            "analysis_metadata": {
                "type": "object",
                "properties": {
                    "brand": {
                        "type": "string",
                        "description": "Brand name from context"
                    },
                    "category": {
                        "type": "string",
                        "description": "Product/service category"
                    },
                    "target_audience": {
                        "type": "string",
                        "description": "Target audience description"
                    },
                    "primary_message": {
                        "type": "string",
                        "description": "Primary message from context"
                    },
                    "secondary_messages": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "Secondary messages from context"
                    }
                },
                "required": [
                    "brand",
                    "category",
                    "target_audience",
                    "primary_message"
                ],
                "additionalProperties": false
            },
            "section_a_attention": {
                "type": "object",
                "properties": {
                    "attention_evidence": {
                        "type": "string",
                        "description": "What the eye sees first + Brand elements"
                    },
                    "attention_analysis": {
                        "type": "string",
                        "description": "Evaluation of stop-power and branding (2-3 sentences in Czech)"
                    },
                    "attention_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "attention_evidence",
                    "attention_analysis",
                    "attention_score"
                ],
                "additionalProperties": false
            },
            "section_b_copy": {
                "type": "object",
                "properties": {
                    "copy_evidence": {
                        "type": "string",
                        "description": "Reading hierarchy (1. ..., 2. ...)"
                    },
                    "copy_analysis": {
                        "type": "string",
                        "description": "Evaluation of Primary vs. Secondary message delivery (2-3 sentences in Czech)"
                    },
                    "copy_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "copy_evidence",
                    "copy_analysis",
                    "copy_score"
                ],
                "additionalProperties": false
            },
            "section_c_offer": {
                "type": "object",
                "properties": {
                    "offer_evidence": {
                        "type": "string",
                        "description": "Visual/textual anchor of the offer"
                    },
                    "offer_analysis": {
                        "type": "string",
                        "description": "Evaluation of attractiveness (2-3 sentences in Czech)"
                    },
                    "offer_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "offer_evidence",
                    "offer_analysis",
                    "offer_score"
                ],
                "additionalProperties": false
            },
            "section_d_cta": {
                "type": "object",
                "properties": {
                    "cta_evidence": {
                        "type": "string",
                        "description": "Description of action element"
                    },
                    "cta_analysis": {
                        "type": "string",
                        "description": "Evaluation of click motivation (2-3 sentences in Czech)"
                    },
                    "cta_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "cta_evidence",
                    "cta_analysis",
                    "cta_score"
                ],
                "additionalProperties": false
            },
            "final_scorecard": {
                "type": "object",
                "properties": {
                    "attention_weighted_score": {
                        "type": "number",
                        "description": "attention_score * 0.3"
                    },
                    "copy_weighted_score": {
                        "type": "number",
                        "description": "copy_score * 0.3"
                    },
                    "offer_weighted_score": {
                        "type": "number",
                        "description": "offer_score * 0.2"
                    },
                    "cta_weighted_score": {
                        "type": "number",
                        "description": "cta_score * 0.2"
                    },
                    "total_score": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 5,
                        "description": "Sum of weighted scores (max 5.0)"
                    },
                    "total_percentage": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "(total_score / 5) * 100"
                    },
                    "attention_verdict": {
                        "type": "string",
                        "description": "Brief comment on Attention section (1 sentence in Czech)"
                    },
                    "copy_verdict": {
                        "type": "string",
                        "description": "Brief comment on Copy section (1 sentence in Czech)"
                    },
                    "offer_verdict": {
                        "type": "string",
                        "description": "Brief comment on Offer section (1 sentence in Czech)"
                    },
                    "cta_verdict": {
                        "type": "string",
                        "description": "Brief comment on CTA section (1 sentence in Czech)"
                    }
                },
                "required": [
                    "attention_weighted_score",
                    "copy_weighted_score",
                    "offer_weighted_score",
                    "cta_weighted_score",
                    "total_score",
                    "total_percentage",
                    "attention_verdict",
                    "copy_verdict",
                    "offer_verdict",
                    "cta_verdict"
                ],
                "additionalProperties": false
            },
            "action_plan": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "action_title": {
                            "type": "string",
                            "description": "Action name (e.g., 'Boost Distinctiveness')"
                        },
                        "action_description": {
                            "type": "string",
                            "description": "Specific instructions (in Czech)"
                        },
                        "priority": {
                            "type": "string",
                            "enum": [
                                "high",
                                "medium",
                                "low"
                            ],
                            "description": "Priority level"
                        }
                    },
                    "required": [
                        "action_title",
                        "action_description",
                        "priority"
                    ],
                    "additionalProperties": false
                },
                "minItems": 3,
                "maxItems": 5,
                "description": "3-5 concrete action steps for optimization"
            }
        },
        "required": [
            "analysis_metadata",
            "section_a_attention",
            "section_b_copy",
            "section_c_offer",
            "section_d_cta",
            "final_scorecard",
            "action_plan"
        ],
        "additionalProperties": false
    }
},
    "video-branding": {
    "tableName": "video_branding_analysis_test",
    "schema": {
        "type": "object",
        "properties": {
            "analysis_metadata": {
                "type": "object",
                "properties": {
                    "brand": {
                        "type": "string",
                        "description": "Brand name from context"
                    },
                    "category": {
                        "type": "string",
                        "description": "Product/service category"
                    },
                    "target_audience": {
                        "type": "string",
                        "description": "Target audience description"
                    },
                    "primary_message": {
                        "type": "string",
                        "description": "Primary message from context"
                    },
                    "secondary_messages": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "Secondary messages from context"
                    }
                },
                "required": [
                    "brand",
                    "category",
                    "target_audience",
                    "primary_message"
                ],
                "additionalProperties": false
            },
            "section_a_linkage": {
                "type": "object",
                "properties": {
                    "linkage_evidence_timestamp": {
                        "type": "string",
                        "description": "Timestamp of key integration moments"
                    },
                    "linkage_evidence_description": {
                        "type": "string",
                        "description": "Description of brand-story connection moments"
                    },
                    "linkage_analysis": {
                        "type": "string",
                        "description": "Evaluation of Brand-Story linkage (2-3 sentences in Czech)"
                    },
                    "linkage_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "linkage_evidence_timestamp",
                    "linkage_evidence_description",
                    "linkage_analysis",
                    "linkage_score"
                ],
                "additionalProperties": false
            },
            "section_b_story": {
                "type": "object",
                "properties": {
                    "story_evidence_timestamp": {
                        "type": "string",
                        "description": "Timestamp of emotional peak"
                    },
                    "story_evidence_description": {
                        "type": "string",
                        "description": "Description of emotional story structure"
                    },
                    "story_analysis": {
                        "type": "string",
                        "description": "Evaluation of story strength (2-3 sentences in Czech)"
                    },
                    "story_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "story_evidence_timestamp",
                    "story_evidence_description",
                    "story_analysis",
                    "story_score"
                ],
                "additionalProperties": false
            },
            "section_c_message": {
                "type": "object",
                "properties": {
                    "message_evidence_timestamp": {
                        "type": "string",
                        "description": "Timestamp of 'Aha moment'"
                    },
                    "message_evidence_description": {
                        "type": "string",
                        "description": "Description of message delivery"
                    },
                    "message_analysis": {
                        "type": "string",
                        "description": "Evaluation of message comprehension (2-3 sentences in Czech)"
                    },
                    "message_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "message_evidence_timestamp",
                    "message_evidence_description",
                    "message_analysis",
                    "message_score"
                ],
                "additionalProperties": false
            },
            "section_d_craft": {
                "type": "object",
                "properties": {
                    "craft_evidence_timestamp": {
                        "type": "string",
                        "description": "Timestamp of craft evaluation"
                    },
                    "craft_evidence_description": {
                        "type": "string",
                        "description": "Description of execution quality"
                    },
                    "craft_analysis": {
                        "type": "string",
                        "description": "Evaluation of craft quality (2-3 sentences in Czech)"
                    },
                    "craft_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "craft_evidence_timestamp",
                    "craft_evidence_description",
                    "craft_analysis",
                    "craft_score"
                ],
                "additionalProperties": false
            },
            "final_scorecard": {
                "type": "object",
                "properties": {
                    "linkage_weighted_score": {
                        "type": "number",
                        "description": "linkage_score * 0.35"
                    },
                    "story_weighted_score": {
                        "type": "number",
                        "description": "story_score * 0.25"
                    },
                    "message_weighted_score": {
                        "type": "number",
                        "description": "message_score * 0.25"
                    },
                    "craft_weighted_score": {
                        "type": "number",
                        "description": "craft_score * 0.15"
                    },
                    "total_score": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 5,
                        "description": "Sum of weighted scores (max 5.0)"
                    },
                    "total_percentage": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "(total_score / 5) * 100"
                    },
                    "linkage_verdict": {
                        "type": "string",
                        "description": "Brief comment on Linkage section (1 sentence in Czech)"
                    },
                    "story_verdict": {
                        "type": "string",
                        "description": "Brief comment on Story section (1 sentence in Czech)"
                    },
                    "message_verdict": {
                        "type": "string",
                        "description": "Brief comment on Message section (1 sentence in Czech)"
                    },
                    "craft_verdict": {
                        "type": "string",
                        "description": "Brief comment on Craft section (1 sentence in Czech)"
                    }
                },
                "required": [
                    "linkage_weighted_score",
                    "story_weighted_score",
                    "message_weighted_score",
                    "craft_weighted_score",
                    "total_score",
                    "total_percentage",
                    "linkage_verdict",
                    "story_verdict",
                    "message_verdict",
                    "craft_verdict"
                ],
                "additionalProperties": false
            },
            "action_plan": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "action_title": {
                            "type": "string",
                            "description": "Action name (e.g., 'Boost Linkage')"
                        },
                        "action_description": {
                            "type": "string",
                            "description": "Specific instructions including timestamps (in Czech)"
                        },
                        "priority": {
                            "type": "string",
                            "enum": [
                                "high",
                                "medium",
                                "low"
                            ],
                            "description": "Priority level"
                        }
                    },
                    "required": [
                        "action_title",
                        "action_description",
                        "priority"
                    ],
                    "additionalProperties": false
                },
                "minItems": 3,
                "maxItems": 5,
                "description": "3-5 concrete action steps for optimization"
            }
        },
        "required": [
            "analysis_metadata",
            "section_a_linkage",
            "section_b_story",
            "section_c_message",
            "section_d_craft",
            "final_scorecard",
            "action_plan"
        ],
        "additionalProperties": false
    }
},
    "video-performance": {
    "tableName": "video_performance_analysis_test",
    "schema": {
        "type": "object",
        "properties": {
            "analysis_metadata": {
                "type": "object",
                "properties": {
                    "brand": {
                        "type": "string",
                        "description": "Brand name from context"
                    },
                    "category": {
                        "type": "string",
                        "description": "Product/service category"
                    },
                    "target_audience": {
                        "type": "string",
                        "description": "Target audience description"
                    },
                    "primary_message": {
                        "type": "string",
                        "description": "Primary message from context"
                    },
                    "secondary_messages": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "Secondary messages from context"
                    }
                },
                "required": [
                    "brand",
                    "category",
                    "target_audience",
                    "primary_message"
                ],
                "additionalProperties": false
            },
            "section_a_hook": {
                "type": "object",
                "properties": {
                    "hook_evidence_timestamp": {
                        "type": "string",
                        "description": "Timestamp of key moment (e.g., '0:00-0:03')"
                    },
                    "hook_evidence_description": {
                        "type": "string",
                        "description": "Description of opening scene"
                    },
                    "hook_analysis": {
                        "type": "string",
                        "description": "Evaluation of hook and branding (2-3 sentences in Czech)"
                    },
                    "hook_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "hook_evidence_timestamp",
                    "hook_evidence_description",
                    "hook_analysis",
                    "hook_score"
                ],
                "additionalProperties": false
            },
            "section_b_message": {
                "type": "object",
                "properties": {
                    "message_evidence_timestamp": {
                        "type": "string",
                        "description": "Timestamp of main message delivery"
                    },
                    "message_evidence_description": {
                        "type": "string",
                        "description": "Description of value proposition moment"
                    },
                    "message_analysis": {
                        "type": "string",
                        "description": "Evaluation of clarity and speed (2-3 sentences in Czech)"
                    },
                    "message_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "message_evidence_timestamp",
                    "message_evidence_description",
                    "message_analysis",
                    "message_score"
                ],
                "additionalProperties": false
            },
            "section_c_pacing": {
                "type": "object",
                "properties": {
                    "pacing_evidence_timestamp": {
                        "type": "string",
                        "description": "Timestamp of weakest or strongest passage"
                    },
                    "pacing_evidence_description": {
                        "type": "string",
                        "description": "Description of editing dynamics"
                    },
                    "pacing_analysis": {
                        "type": "string",
                        "description": "Evaluation of rhythm and editing (2-3 sentences in Czech)"
                    },
                    "pacing_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "pacing_evidence_timestamp",
                    "pacing_evidence_description",
                    "pacing_analysis",
                    "pacing_score"
                ],
                "additionalProperties": false
            },
            "section_d_cta": {
                "type": "object",
                "properties": {
                    "cta_evidence_timestamp": {
                        "type": "string",
                        "description": "Timestamp of CTA appearance"
                    },
                    "cta_evidence_description": {
                        "type": "string",
                        "description": "Description of final call-to-action"
                    },
                    "cta_analysis": {
                        "type": "string",
                        "description": "Evaluation of CTA strength (2-3 sentences in Czech)"
                    },
                    "cta_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Score 1-5"
                    }
                },
                "required": [
                    "cta_evidence_timestamp",
                    "cta_evidence_description",
                    "cta_analysis",
                    "cta_score"
                ],
                "additionalProperties": false
            },
            "final_scorecard": {
                "type": "object",
                "properties": {
                    "hook_weighted_score": {
                        "type": "number",
                        "description": "hook_score * 0.3"
                    },
                    "message_weighted_score": {
                        "type": "number",
                        "description": "message_score * 0.3"
                    },
                    "pacing_weighted_score": {
                        "type": "number",
                        "description": "pacing_score * 0.2"
                    },
                    "cta_weighted_score": {
                        "type": "number",
                        "description": "cta_score * 0.2"
                    },
                    "total_score": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 5,
                        "description": "Sum of weighted scores (max 5.0)"
                    },
                    "total_percentage": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "(total_score / 5) * 100"
                    },
                    "hook_verdict": {
                        "type": "string",
                        "description": "Brief comment on Hook section (1 sentence in Czech)"
                    },
                    "message_verdict": {
                        "type": "string",
                        "description": "Brief comment on Message section (1 sentence in Czech)"
                    },
                    "pacing_verdict": {
                        "type": "string",
                        "description": "Brief comment on Pacing section (1 sentence in Czech)"
                    },
                    "cta_verdict": {
                        "type": "string",
                        "description": "Brief comment on CTA section (1 sentence in Czech)"
                    }
                },
                "required": [
                    "hook_weighted_score",
                    "message_weighted_score",
                    "pacing_weighted_score",
                    "cta_weighted_score",
                    "total_score",
                    "total_percentage",
                    "hook_verdict",
                    "message_verdict",
                    "pacing_verdict",
                    "cta_verdict"
                ],
                "additionalProperties": false
            },
            "action_plan": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "action_title": {
                            "type": "string",
                            "description": "Action name (e.g., 'Hook Optimization')"
                        },
                        "action_description": {
                            "type": "string",
                            "description": "Specific instructions including timestamps (in Czech)"
                        },
                        "priority": {
                            "type": "string",
                            "enum": [
                                "high",
                                "medium",
                                "low"
                            ],
                            "description": "Priority level"
                        }
                    },
                    "required": [
                        "action_title",
                        "action_description",
                        "priority"
                    ],
                    "additionalProperties": false
                },
                "minItems": 3,
                "maxItems": 5,
                "description": "3-5 concrete action steps for optimization"
            }
        },
        "required": [
            "analysis_metadata",
            "section_a_hook",
            "section_b_message",
            "section_c_pacing",
            "section_d_cta",
            "final_scorecard",
            "action_plan"
        ],
        "additionalProperties": false
    }
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
