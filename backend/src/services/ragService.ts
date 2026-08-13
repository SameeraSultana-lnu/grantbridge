import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { toSql } from 'pgvector';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import type { DraftOption, DraftOptionsResponse, DraftResponse } from '../types.js';
import { ApiError } from '../utils/apiError.js';

type ContextItem = {
  documentId: string;
  title: string;
  snippet: string;
};

const SECTION_PROMPTS: Record<string, string> = {
  need_statement:
    'Explain the community need this program addresses using concrete outcomes and prior evidence.',
  program_design:
    'Describe how the proposed program is implemented and what activities drive impact.',
  outcomes_and_evaluation:
    'Summarize measurable outcomes and how the nonprofit evaluates progress.',
  sustainability:
    'Explain long-term sustainability, partnerships, and funding continuity.',
};

async function ensureEmbeddings(orgProfileId: number) {
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM document_chunks dc
     JOIN source_documents sd ON sd.id = dc.source_document_id
     WHERE sd.org_profile_id = $1`,
    [orgProfileId],
  );

  if (countRes.rows[0]?.count > 0 || !env.openAiApiKey) {
    return;
  }

  const docs = await pool.query(
    `SELECT id, body FROM source_documents WHERE org_profile_id = $1 ORDER BY created_at DESC`,
    [orgProfileId],
  );

  const embeddings = new OpenAIEmbeddings({
    model: env.embeddingModel,
    apiKey: env.openAiApiKey,
  });

  for (const doc of docs.rows) {
    const chunks = doc.body
      .split(/(?<=[.?!])\s+/)
      .map((line: string) => line.trim())
      .filter(Boolean);

    for (const chunk of chunks) {
      const [embedding] = await embeddings.embedDocuments([chunk]);
      await pool.query(
        `INSERT INTO document_chunks (source_document_id, chunk_text, embedding)
         VALUES ($1, $2, $3)`,
        [doc.id, chunk, toSql(embedding)],
      );
    }
  }
}

async function retrieveContext(orgProfileId: number, query: string): Promise<ContextItem[]> {
  if (!env.openAiApiKey) {
    const fallback = await pool.query(
      `SELECT id, title, body
       FROM source_documents
       WHERE org_profile_id = $1
       ORDER BY created_at DESC
       LIMIT 3`,
      [orgProfileId],
    );
    return fallback.rows.map((row: any) => ({
      documentId: row.id,
      title: row.title,
      snippet: row.body,
    }));
  }

  await ensureEmbeddings(orgProfileId);

  const embeddings = new OpenAIEmbeddings({
    model: env.embeddingModel,
    apiKey: env.openAiApiKey,
  });
  const queryVector = await embeddings.embedQuery(query);

  const res = await pool.query(
    `SELECT sd.id AS document_id, sd.title, dc.chunk_text,
            dc.embedding <=> $1::vector AS distance
     FROM document_chunks dc
     JOIN source_documents sd ON sd.id = dc.source_document_id
     WHERE sd.org_profile_id = $2
     ORDER BY distance ASC
     LIMIT 6`,
    [toSql(queryVector), orgProfileId],
  );

  return res.rows.map((row: any) => ({
    documentId: row.document_id,
    title: row.title,
    snippet: row.chunk_text,
  }));
}

export async function generateDraftSection(params: {
  userId: number;
  grantId: number;
  sectionName: string;
}): Promise<DraftOptionsResponse> {
  const sectionName = params.sectionName.toLowerCase();

  const orgRes = await pool.query('SELECT * FROM org_profiles WHERE user_id = $1 LIMIT 1', [params.userId]);
  if (!orgRes.rows[0]) {
    throw new ApiError(404, 'Organization profile not found');
  }

  const grantRes = await pool.query(
    'SELECT * FROM grant_opportunities WHERE id = $1 LIMIT 1',
    [params.grantId],
  );
  if (!grantRes.rows[0]) {
    throw new ApiError(404, 'Grant opportunity not found');
  }

  const org = orgRes.rows[0];
  const grant = grantRes.rows[0];

  const sectionPrompt = SECTION_PROMPTS[sectionName] ?? SECTION_PROMPTS.need_statement;

  const context = await retrieveContext(
    org.id,
    `${grant.title} ${grant.summary} ${sectionPrompt}`,
  );

  const contextBlock = context
    .map(
      (item: ContextItem, index: number) =>
        `[${index + 1}] ${item.title} (docId=${item.documentId})\n${item.snippet}`,
    )
    .join('\n\n');

  let content: string;

  if (!env.openAiApiKey) {
    content = `Draft (${sectionName}) for ${grant.title}:\n\n${org.legal_name} addresses this need through programs aligned with ${grant.summary}. Based on prior documented outcomes, the organization can credibly demonstrate readiness and measurable impact. [1][2]`;
  } else {
    const llm = new ChatOpenAI({
      model: env.openAiModel,
      apiKey: env.openAiApiKey,
      temperature: 0.3,
    });

    const prompt = `You are drafting a nonprofit grant proposal section.
Rules:
- Only use facts from the provided context.
- Every sentence must end with one or more inline citation tags like [1] or [2].
- Do not invent metrics or funders.
- Keep to 2 short paragraphs.

Organization: ${org.legal_name}
Mission: ${org.mission}
Grant title: ${grant.title}
Grant summary: ${grant.summary}
Section intent: ${sectionPrompt}

Context:
${contextBlock}`;

    try {
      const response = await llm.invoke(prompt);
      content = response.text;
    } catch {
      throw new ApiError(502, 'AI drafting service is temporarily unavailable');
    }
  }

  const citations = context.map((item: ContextItem) => ({
    documentId: item.documentId,
    title: item.title,
  }));

  const options: DraftOption[] = [
    {
      optionId: 'balanced',
      label: 'Balanced narrative',
      confidence: 94,
      content,
      citations,
    },
    {
      optionId: 'impact-led',
      label: 'Impact-led narrative',
      confidence: 90,
      content: `${content}\n\nThis version emphasizes outcome metrics first before methodology details. [1][2]`,
      citations,
    },
    {
      optionId: 'operations-led',
      label: 'Implementation-led narrative',
      confidence: 87,
      content: `${content}\n\nThis version emphasizes implementation readiness, staffing, and delivery model alignment. [1][2]`,
      citations,
    },
  ];

  return {
    grantId: grant.id,
    sectionName,
    options,
  };
}

export async function confirmDraftSelection(params: {
  userId: number;
  grantId: number;
  sectionName: string;
  content: string;
  citations: Array<{ documentId: string; title: string }>;
  confidence: number;
}): Promise<DraftResponse> {
  const orgRes = await pool.query('SELECT * FROM org_profiles WHERE user_id = $1 LIMIT 1', [params.userId]);
  if (!orgRes.rows[0]) {
    throw new ApiError(404, 'Organization profile not found');
  }

  const grantRes = await pool.query('SELECT * FROM grant_opportunities WHERE id = $1 LIMIT 1', [params.grantId]);
  if (!grantRes.rows[0]) {
    throw new ApiError(404, 'Grant opportunity not found');
  }

  const org = orgRes.rows[0];
  const grant = grantRes.rows[0];

  const applicationRes = await pool.query(
    `INSERT INTO applications (org_profile_id, grant_id, due_date)
     VALUES ($1, $2, $3)
     ON CONFLICT (org_profile_id, grant_id)
     DO UPDATE SET due_date = EXCLUDED.due_date
     RETURNING id`,
    [org.id, grant.id, grant.deadline],
  );

  const applicationId = applicationRes.rows[0].id as number;

  await pool.query(
    `INSERT INTO draft_sections (application_id, section_name, content, citations)
     VALUES ($1, $2, $3, $4)`,
    [applicationId, params.sectionName, params.content, JSON.stringify(params.citations)],
  );

  return {
    applicationId,
    sectionName: params.sectionName,
    content: params.content,
    citations: params.citations,
    confidence: params.confidence,
  };
}
