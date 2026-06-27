import { MemoryType } from './types';

// Anchor phrases representing the 4 semantic tiers
const ANCHORS: Record<MemoryType, string[]> = {
  immutable: [
    "Never use Firebase",
    "Do not use external libraries",
    "Must follow GDPR compliance guidelines",
    "Rule: always validate input parameters",
    "Strict restriction: avoid third party hosting",
    "Ensure all user data is encrypted",
    "Do not write custom sorting algorithms",
    "Under no circumstances should API keys be checked into version control"
  ],
  persistent: [
    "The backend is built with FastAPI and Python",
    "We are using PostgreSQL for our main database",
    "Project architecture uses clean code principles",
    "The app uses React 18, Vite, and Tailwind CSS",
    "State is managed using Redux Toolkit",
    "Deployment is handled via Docker and AWS ECS",
    "User authentication is handled via JWT tokens"
  ],
  session: [
    "Build the dashboard login page component",
    "Add a new REST API endpoint for user profile retrieval",
    "Implement Framer Motion animations for the sidebar",
    "Fix the layout shift issue on mobile responsive header",
    "Create a mock dataset for the charting engine",
    "Write unit tests for the authentication reducer",
    "Refactor the memory store class to support clear method"
  ],
  ephemeral: [
    "Hello there! How can I help you?",
    "Thanks for the detailed explanation",
    "That is awesome, thank you so much",
    "Good morning, let us start",
    "Yes, that makes sense, let us do that",
    "Okay, cool, I will take a look at it now",
    "Hi, I have a quick question about this setup"
  ]
};

export class SemanticClassifier {
  private pipelineInstance: any = null;
  private isModelLoading = false;
  private isModelReady = false;
  private anchorEmbeddings: Record<MemoryType, number[][]> = {
    immutable: [],
    persistent: [],
    session: [],
    ephemeral: []
  };

  constructor() {
    this.initModel();
  }

  // Pre-load model asynchronously
  private async initModel() {
    if (typeof window === 'undefined') return;
    if (this.isModelLoading || this.isModelReady) return;

    this.isModelLoading = true;
    try {
      // Dynamic import of transformers to avoid blocking or bundle issues in non-wasm nodes
      const { pipeline } = await import('@huggingface/transformers');
      this.pipelineInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        progress_callback: (info: any) => {
          if (info.status === 'ready') {
            console.log('Transformers.js embedding model ready');
          }
        }
      });

      // Pre-compute anchor embeddings to make active queries faster
      for (const type of Object.keys(ANCHORS) as MemoryType[]) {
        const typeEmbeds: number[][] = [];
        for (const anchor of ANCHORS[type]) {
          const res = await this.getTransformersEmbedding(anchor);
          if (res) typeEmbeds.push(res);
        }
        this.anchorEmbeddings[type] = typeEmbeds;
      }

      this.isModelReady = true;
    } catch (e) {
      console.warn('Transformers.js loading failed or not supported in this environment, using TF-IDF fallback:', e);
    } finally {
      this.isModelLoading = false;
    }
  }

  public async getTransformersEmbedding(text: string): Promise<number[] | null> {
    if (!this.pipelineInstance) return null;
    try {
      const output = await this.pipelineInstance(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (e) {
      console.error('Error generating embedding:', e);
      return null;
    }
  }

  // Pure TypeScript cosine similarity helper
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public getIsModelReady(): boolean {
    return this.isModelReady;
  }

  public async getEmbedding(text: string): Promise<number[] | null> {
    return this.getTransformersEmbedding(text);
  }

  // Fast TF-IDF / Jaccard token fallback matching
  private classifyFallback(text: string): { type: MemoryType; confidence: number } {
    const textTokens = this.tokenize(text);
    if (textTokens.length === 0) {
      return { type: 'ephemeral', confidence: 0.5 };
    }

    // Direct keyword overrides for high confidence Immutable rules
    const lowerText = text.toLowerCase();
    const immutableKeywords = ['never', 'do not', 'must not', 'compliance', 'guideline', 'security rule', 'prohibited', 'avoid', 'mandatory'];
    const sessionKeywords = ['build', 'create', 'implement', 'fix', 'refactor', 'setup', 'add a', 'render', 'write unit test'];
    
    // Check immutable keywords first
    for (const kw of immutableKeywords) {
      if (lowerText.includes(kw)) {
        // Boost likelihood of immutable if the tone is directive
        if (lowerText.includes('use') || lowerText.includes('allow') || lowerText.includes('do') || lowerText.includes('write')) {
          return { type: 'immutable', confidence: 0.85 };
        }
      }
    }

    let bestType: MemoryType = 'ephemeral';
    let highestSim = -1;

    for (const type of Object.keys(ANCHORS) as MemoryType[]) {
      for (const anchor of ANCHORS[type]) {
        const anchorTokens = this.tokenize(anchor);
        const sim = this.jaccardSimilarity(textTokens, anchorTokens);
        
        // Boost specific types based on keyword checks
        let boostedSim = sim;
        if (type === 'immutable') {
          for (const kw of immutableKeywords) {
            if (lowerText.includes(kw)) boostedSim += 0.15;
          }
        } else if (type === 'session') {
          for (const kw of sessionKeywords) {
            if (lowerText.includes(kw)) boostedSim += 0.15;
          }
        }

        if (boostedSim > highestSim) {
          highestSim = boostedSim;
          bestType = type;
        }
      }
    }

    // Normalize confidence bounds
    let confidence = Math.min(Math.max(highestSim * 2 + 0.3, 0.4), 0.95);
    return { type: bestType, confidence };
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2); // Filter out tiny words like "a", "to", "is"
  }

  private jaccardSimilarity(setA: string[], setB: string[]): number {
    const sA = new Set(setA);
    const sB = new Set(setB);
    const intersection = new Set([...sA].filter(x => sB.has(x)));
    const union = new Set([...sA, ...sB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  // Core classification endpoint
  public async classify(text: string, entities?: Entity[]): Promise<{ type: MemoryType; confidence: number }> {
    const lowerText = text.toLowerCase().trim();
    const resolvedEntities = entities || extractEntities(text);

    // Heuristic override for Ephemeral: tentative suggestions, opinions, chitchat
    const strictEphemeralPatterns = [
      /\b(maybe|try\s+later|should\s+try|consider|might|could|think\s+about|possibly|suggest)\b/i
    ];
    for (const pattern of strictEphemeralPatterns) {
      if (pattern.test(lowerText)) {
        return { type: 'ephemeral', confidence: 0.60 };
      }
    }

    // Entity-based heuristic overrides
    const hasRuleEntity = resolvedEntities.some(e => e.category === 'Rule');
    const hasFrameworkOrDB = resolvedEntities.some(e => e.category === 'Framework' || e.category === 'Database');
    const hasTaskEntity = resolvedEntities.some(e => e.category === 'Task');

    // Heuristic override for Immutable: strict rules and constraints
    const strictImmutablePatterns = [
      /^(never\s+use|do\s+not\s+use|avoid\s+using)\s+/i,
      /\b(must\s+follow|must\s+comply\s+with|compliance\s+guidelines)\b/i,
      /\bunder\s+no\s+circumstances\b/i
    ];
    for (const pattern of strictImmutablePatterns) {
      if (pattern.test(lowerText) || (hasRuleEntity && (lowerText.includes('never') || lowerText.includes('do not') || lowerText.includes('avoid') || lowerText.includes('must') || lowerText.includes('prohibited')))) {
        return { type: 'immutable', confidence: 0.95 };
      }
    }

    // Heuristic override for Persistent: core architecture, tech stack & db configurations
    const strictPersistentPatterns = [
      /\b(backend\s+uses|frontend\s+uses|stack\s+is|database\s+is|built\s+with|built\s+using)\s+(fastapi|postgresql|sqlalchemy|react|vite|redux|django|express|mongodb|docker|aws)\b/i,
      /\bmain\s+database\s+is\b/i
    ];
    for (const pattern of strictPersistentPatterns) {
      if (pattern.test(lowerText) || (hasFrameworkOrDB && (lowerText.includes('use') || lowerText.includes('built') || lowerText.includes('backend') || lowerText.includes('database')))) {
        return { type: 'persistent', confidence: 0.90 };
      }
    }

    // Heuristic override for Session: action-oriented active tasks
    const strictSessionPatterns = [
      /^(build|create|implement|fix|refactor|add\s+a|setup|write\s+unit\s+tests?\s+for)\s+/i
    ];
    for (const pattern of strictSessionPatterns) {
      if (pattern.test(lowerText) || (hasTaskEntity && (lowerText.includes('build') || lowerText.includes('create') || lowerText.includes('implement') || lowerText.includes('fix') || lowerText.includes('refactor')))) {
        return { type: 'session', confidence: 0.90 };
      }
    }

    // If embedding model is ready, run vector-based similarity
    if (this.isModelReady && this.pipelineInstance) {
      const inputEmbed = await this.getTransformersEmbedding(text);
      if (inputEmbed) {
        let bestType: MemoryType = 'ephemeral';
        let highestSimilarity = -1;

        for (const type of Object.keys(this.anchorEmbeddings) as MemoryType[]) {
          const embeds = this.anchorEmbeddings[type];
          for (const anchorEmbed of embeds) {
            const similarity = this.cosineSimilarity(inputEmbed, anchorEmbed);
            if (similarity > highestSimilarity) {
              highestSimilarity = similarity;
              bestType = type;
            }
          }
        }

        // Map similarity (ranges roughly 0.2 to 0.8+ for related things) to a reasonable confidence score
        const confidence = Math.min(Math.max((highestSimilarity - 0.2) / 0.6, 0.5), 0.99);
        return { type: bestType, confidence };
      }
    }

    // Fallback to TF-IDF / heuristic matcher
    return this.classifyFallback(text);
  }
}

export interface Entity {
  name: string;
  category: 'Framework' | 'Database' | 'Technology' | 'Project' | 'Rule' | 'Task';
}

const ENTITY_DICTIONARY: { name: string; category: Entity['category'] }[] = [
  // Frameworks
  { name: 'FastAPI', category: 'Framework' },
  { name: 'React', category: 'Framework' },
  { name: 'Angular', category: 'Framework' },
  { name: 'Vue', category: 'Framework' },
  { name: 'Next.js', category: 'Framework' },
  { name: 'Express', category: 'Framework' },
  { name: 'Django', category: 'Framework' },
  { name: 'Flask', category: 'Framework' },
  { name: 'Spring', category: 'Framework' },
  { name: 'Laravel', category: 'Framework' },
  { name: 'Rails', category: 'Framework' },
  { name: 'Svelte', category: 'Framework' },
  // Databases
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'Postgres', category: 'Database' },
  { name: 'MongoDB', category: 'Database' },
  { name: 'MySQL', category: 'Database' },
  { name: 'SQLite', category: 'Database' },
  { name: 'Redis', category: 'Database' },
  { name: 'DynamoDB', category: 'Database' },
  { name: 'Cassandra', category: 'Database' },
  { name: 'MariaDB', category: 'Database' },
  { name: 'Supabase', category: 'Database' },
  // Technologies
  { name: 'JWT', category: 'Technology' },
  { name: 'REST API', category: 'Technology' },
  { name: 'REST', category: 'Technology' },
  { name: 'GraphQL', category: 'Technology' },
  { name: 'Docker', category: 'Technology' },
  { name: 'Kubernetes', category: 'Technology' },
  { name: 'AWS', category: 'Technology' },
  { name: 'GCP', category: 'Technology' },
  { name: 'Azure', category: 'Technology' },
  { name: 'Firebase', category: 'Technology' },
  { name: 'OAuth', category: 'Technology' },
  { name: 'OIDC', category: 'Technology' },
  { name: 'gRPC', category: 'Technology' },
  { name: 'WebSockets', category: 'Technology' },
  { name: 'TypeScript', category: 'Technology' },
  { name: 'JavaScript', category: 'Technology' },
  { name: 'Python', category: 'Technology' },
  { name: 'HTML', category: 'Technology' },
  { name: 'CSS', category: 'Technology' },
  { name: 'Tailwind', category: 'Technology' },
  { name: 'Vite', category: 'Technology' },
  // Projects
  { name: 'ARCA', category: 'Project' },
  // Rules
  { name: 'Native APIs', category: 'Rule' },
  { name: 'External libraries', category: 'Rule' },
  { name: 'GDPR', category: 'Rule' },
  { name: 'HIPAA', category: 'Rule' },
  { name: 'PCI-DSS', category: 'Rule' },
  // Tasks
  { name: 'Login Page', category: 'Task' },
  { name: 'Authentication', category: 'Task' },
  { name: 'Auth', category: 'Task' },
  { name: 'Dashboard', category: 'Task' },
  { name: 'Signup', category: 'Task' },
  { name: 'Payment', category: 'Task' },
  { name: 'Search', category: 'Task' },
  { name: 'Notification', category: 'Task' },
  { name: 'Profile', category: 'Task' }
];

export function extractEntities(text: string): Entity[] {
  const extracted: Entity[] = [];
  const lowerText = text.toLowerCase();

  // 1. Dictionary-based extraction (bootstrap)
  for (const item of ENTITY_DICTIONARY) {
    const escapedName = item.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedName}\\b`, 'i');
    if (regex.test(lowerText)) {
      extracted.push(item);
    }
  }

  // 2. Pattern-based extraction for unseen technologies/frameworks/projects/rules/tasks
  const isAlreadyExtracted = (name: string) => 
    extracted.some(e => e.name.toLowerCase() === name.toLowerCase());

  // Pattern A: Prohibited/Forbidden context (Rules/Technologies)
  const prohibitedRegexes = [
    /\b(?:never\s+use|do\s+not\s+use|avoid\s+using|prohibited|forbidden|restricted|banned|not\s+allowed)\s+([a-zA-Z0-9.\-_]+)\b/i,
    /\b([a-zA-Z0-9.\-_]+)\s+(?:is\s+prohibited|is\s+forbidden|is\s+restricted|is\s+banned|is\s+not\s+allowed)\b/i
  ];
  for (const regex of prohibitedRegexes) {
    const match = regex.exec(text);
    if (match && match[1]) {
      const name = match[1];
      const stopWords = ['a', 'the', 'it', 'them', 'that', 'this', 'to', 'using', 'use', 'any', 'some', 'other'];
      if (!stopWords.includes(name.toLowerCase()) && !isAlreadyExtracted(name)) {
        extracted.push({ name, category: 'Technology' });
      }
    }
  }

  // Pattern B: Backend/Frontend build context (Frameworks/Technologies)
  const buildRegexes = [
    /\b(?:building|developing)\s+(?:a\s+)?([a-zA-Z0-9.\-_]+)\s+(?:backend|frontend|app|application|service)\b/i,
    /\b(?:backend|frontend|app|application|service|database)\s+(?:is|will\s+be)\s+(?:built\s+with|using|written\s+in)\s+([a-zA-Z0-9.\-_]+)\b/i
  ];
  for (const regex of buildRegexes) {
    const match = regex.exec(text);
    if (match && match[1]) {
      const name = match[1];
      const stopWords = ['a', 'the', 'it', 'to', 'an', 'our', 'new', 'custom', 'modern'];
      if (!stopWords.includes(name.toLowerCase()) && !isAlreadyExtracted(name)) {
        extracted.push({ name, category: 'Framework' });
      }
    }
  }

  // Pattern C: Database context
  const dbRegexes = [
    /\buses?\s+([a-zA-Z0-9.\-_]+)\s+for\s+(?:our\s+)?(?:main\s+)?database\b/i,
    /\bdatabase\s+(?:is|will\s+be)\s+([a-zA-Z0-9.\-_]+)\b/i
  ];
  for (const regex of dbRegexes) {
    const match = regex.exec(text);
    if (match && match[1]) {
      const name = match[1];
      if (!isAlreadyExtracted(name)) {
        extracted.push({ name, category: 'Database' });
      }
    }
  }

  // Pattern D: Task/Feature + technology association
  const taskTechRegex = /\b([a-zA-Z0-9.\-_]+)\s+(?:will\s+use|uses|is\s+handled\s+via|is\s+built\s+with)\s+([a-zA-Z0-9.\-_]+)\b/i;
  const matchD = taskTechRegex.exec(text);
  if (matchD && matchD[1] && matchD[2]) {
    const taskName = matchD[1];
    const techName = matchD[2];
    const isTaskLike = /tion\b|ing\b|ment\b|auth|login|signup|dashboard|payment|search|profile/i.test(taskName);
    if (isTaskLike && !isAlreadyExtracted(taskName)) {
      extracted.push({ name: taskName, category: 'Task' });
    }
    if (!isAlreadyExtracted(techName)) {
      const stopWords = ['a', 'the', 'it', 'an', 'some'];
      if (!stopWords.includes(techName.toLowerCase())) {
        extracted.push({ name: techName, category: 'Technology' });
      }
    }
  }

  // Deduplicate and resolve synonyms
  const unique: Entity[] = [];
  const seenNames = new Set<string>();
  for (const ent of extracted) {
    let name = ent.name;
    if (name.toLowerCase() === 'postgres') {
      name = 'PostgreSQL';
    }
    if (name.toLowerCase() === 'auth') {
      name = 'Authentication';
    }
    
    if (!seenNames.has(name.toLowerCase())) {
      seenNames.add(name.toLowerCase());
      unique.push({ name, category: ent.category });
    }
  }

  return unique;
}

export function segmentText(text: string): string[] {
  const sentences = text.split(/[.!?]+(?:\s+|\n|$)+|\n+/);
  const segments: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\b(?:because|but|although|though|while|whereas|so)\b/i);
    for (const part of parts) {
      const cleanPart = part.trim().replace(/^[,;:\s]+|[,;:\s]+$/g, "");
      if (cleanPart.length > 3) {
        segments.push(cleanPart);
      }
    }
  }
  return segments;
}

export function isFiller(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return true;

  const clean = trimmed.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
  const words = clean.split(/\s+/).filter(w => w.length > 0);

  if (words.length <= 3) {
    const fillerWords = [
      'hello', 'hi', 'hey', 'yo', 'greetings', 'welcome', 'howdy',
      'thanks', 'thank', 'ok', 'okay', 'cool', 'awesome', 'great', 'nice', 'good',
      'yes', 'no', 'sure', 'fine', 'perfect', 'indeed', 'totally', 'absolutely',
      'bye', 'goodbye', 'laters', 'understood', 'gotcha', 'gotit', 'wow', 'interesting',
      'yum', 'yummy', 'hungry', 'food', 'lunch', 'dinner', 'breakfast'
    ];
    if (words.every(w => fillerWords.includes(w))) {
      return true;
    }
  }

  const fillerPatterns = [
    /^(hello|hi|hey|greetings|howdy|yo|welcome|good\s+morning|good\s+afternoon|good\s+evening)\b/i,
    /\b(bye|goodbye|see\s+you\s+later|talk\s+later|farewell|take\s+care)\b/i,
    /^(thanks|thank\s+you|no\s+problem|you're\s+welcome|my\s+pleasure|anytime)\b/i,
    /\b(nice\s+work|good\s+job|great\s+job|well\s+done|keep\s+it\s+up|awesome|perfect|cool|nice|good|excellent|wonderful|fantastic)\b/i,
    /^(ok|okay|got\s+it|makes\s+sense|makes\s+perfect\s+sense|understood|acknowledged)\b/i,
    /\b(how\s+are\s+you|how\s+is\s+it\s+going|how's\s+it\s+going|what's\s+up|whats\s+up|how\s+are\s+things)\b/i,
    /\b(hope\s+you\s+are\s+doing\s+well|hope\s+you're\s+doing\s+well|let's\s+start|let's\s+get\s+started)\b/i,
    /\b(weather\s+is|weather\s+looks|raining|sunny|cloudy|hot\s+today|cold\s+today|how's\s+the\s+weather|nice\s+day|beautiful\s+day)\b/i,
    /\b(i\s+like|i\s+love|favorite\s+food|favorite\s+drink|pizza|burger|sushi|pasta|lunch|dinner|breakfast|snack|hungry|delicious|tasty)\b/i,
    /^(just\s+a\s+random\s+thought|by\s+the\s+way|speaking\s+of\s+which|actually|random\s+observation)\b/i
  ];

  for (const pattern of fillerPatterns) {
    if (pattern.test(clean)) {
      return true;
    }
  }

  return false;
}

export function extractMemoryCandidate(segment: string, entities: Entity[]): string {
  const lower = segment.toLowerCase();
  
  // 1. Prohibited check
  const prohibitedKeywords = ['prohibited', 'forbidden', 'must not', 'never', 'do not', 'avoid', 'restricted', 'ban', 'banned'];
  if (prohibitedKeywords.some(kw => lower.includes(kw))) {
    const targetEntity = entities.find(e => lower.includes(e.name.toLowerCase()));
    if (targetEntity) {
      return `Never use ${targetEntity.name}`;
    }
  }

  // 2. Tech Stack - Backend check
  if (lower.includes('backend') && entities.some(e => e.category === 'Framework' && lower.includes(e.name.toLowerCase()))) {
    const framework = entities.find(e => e.category === 'Framework' && lower.includes(e.name.toLowerCase()));
    if (framework) {
      return `Backend uses ${framework.name}`;
    }
  }

  // 3. Tech Stack - Database check
  if (lower.includes('database') && entities.some(e => e.category === 'Database' && lower.includes(e.name.toLowerCase()))) {
    const db = entities.find(e => e.category === 'Database' && lower.includes(e.name.toLowerCase()));
    if (db) {
      return `Database is ${db.name}`;
    }
  }

  // 4. Task and Technology association
  const taskEntity = entities.find(e => e.category === 'Task');
  const techEntity = entities.find(e => e.category === 'Technology' || e.category === 'Framework' || e.category === 'Database');
  if (taskEntity && techEntity && lower.indexOf(taskEntity.name.toLowerCase()) < lower.indexOf(techEntity.name.toLowerCase())) {
    return `${taskEntity.name} uses ${techEntity.name}`;
  }

  // 5. Default normalization
  let clean = segment
    .replace(/^(we\s+are\s+building\s+a\s+|we\s+are\s+using\s+|we\s+need\s+to\s+|let's\s+use\s+|we\s+will\s+use\s+|we\s+should\s+use\s+|maybe\s+we\s+should\s+try\s+|we\s+should\s+try\s+)/i, '')
    .trim();
  
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  
  clean = clean.replace(/\bwill\s+use\s+/i, 'uses ');
  clean = clean.replace(/\bwill\s+be\s+built\s+with\s+/i, 'is built with ');
  
  return clean;
}

export function calculateConfidence(
  text: string,
  type: MemoryType,
  entities: Entity[]
): { score: number; reason: string } {
  const lower = text.toLowerCase();
  
  // 1. Explicit rule check (Immutable)
  const isRule = type === 'immutable' || 
                 lower.includes('never') || 
                 lower.includes('do not') || 
                 lower.includes('must not') || 
                 lower.includes('prohibited') ||
                 lower.includes('forbidden') ||
                 lower.includes('rule:') ||
                 entities.some(e => e.category === 'Rule');
                 
  if (isRule && (lower.includes('never') || lower.includes('do not') || lower.includes('prohibited') || lower.includes('forbidden'))) {
    return {
      score: 99,
      reason: 'Explicit rule.'
    };
  }

  // 2. Tentative suggestions
  const tentativeKeywords = ['maybe', 'try', 'later', 'should try', 'consider', 'might', 'could', 'think about', 'possibly', 'suggest'];
  if (tentativeKeywords.some(kw => lower.includes(kw))) {
    return {
      score: 58,
      reason: 'Tentative suggestion.'
    };
  }

  // 3. Technology stack information / Persistent
  const hasTech = entities.some(e => e.category === 'Framework' || e.category === 'Database' || e.category === 'Technology');
  if (type === 'persistent' || (hasTech && (lower.includes('use') || lower.includes('built') || lower.includes('backend') || lower.includes('database')))) {
    return {
      score: 95,
      reason: 'Technology stack information.'
    };
  }

  // 4. Default / General task information / Session
  if (type === 'session' || entities.some(e => e.category === 'Task')) {
    return {
      score: 85,
      reason: 'Task details or general project information.'
    };
  }

  // 5. Default
  return {
    score: 75,
    reason: 'Project information.'
  };
}
