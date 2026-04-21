import { ApiError, ValidationError } from '../core/errors';
import type {
  ApiTransport,
  LlmModelDefinition,
  LlmModelSummary,
  LlmRequest,
  LlmResponse,
  RawLlmModelInfoEnvelope,
  RawLlmModelListEnvelope,
  RawSerpRequestSchema,
  SerpParameterDefinition
} from '../types/api';

const LLM_METADATA_TYPE = 7;
const LLM_MODEL_LIST_PATH = '/web_v1/scraping/xcrawl';
const LLM_MODEL_INFO_PATH = '/web_v1/scraping/xcrawl-info';

export async function listLlmModels(client: ApiTransport): Promise<LlmModelSummary[]> {
  const raw = await client.get<RawLlmModelListEnvelope>(LLM_MODEL_LIST_PATH, {
    query: { type: LLM_METADATA_TYPE }
  });

  if (raw.code !== 200 || !raw.data?.list) {
    throw new ValidationError(
      'Unable to load LLM models.',
      'Retry later, or verify that https://api.xcrawl.com is reachable.'
    );
  }

  return raw.data.list
    .filter((item): item is { scraper: string; name: string; website: string; domain?: string; desc?: string } => {
      return Boolean(item.scraper && item.name && item.website);
    })
    .map((item) => ({
      scraper: item.scraper,
      name: item.name,
      website: item.website,
      domain: item.domain,
      description: item.desc
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLlmModelDefinition(client: ApiTransport, scraper: string): Promise<LlmModelDefinition> {
  try {
    const raw = await client.get<RawLlmModelInfoEnvelope>(LLM_MODEL_INFO_PATH, {
      query: {
        scraper,
        type: LLM_METADATA_TYPE
      }
    });

    if (raw.code !== 200 || !raw.data) {
      throw new ValidationError(
        `Unsupported LLM model: ${scraper}.`,
        'Run `xcrawl llm --list-models` to inspect supported LLM models.'
      );
    }

    return normalizeLlmModelDefinition(scraper, raw.data.request_params, raw.data);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    if (error instanceof ApiError && error.status === 404) {
      throw new ValidationError(
        `Unsupported LLM model: ${scraper}.`,
        'Run `xcrawl llm --list-models` to inspect supported LLM models.',
        error
      );
    }

    throw error;
  }
}

export async function runLlm(client: ApiTransport, request: LlmRequest): Promise<LlmResponse> {
  return client.post<LlmResponse>('/v1/llm', {
    body: {
      engine: request.engine,
      ...request.params
    }
  });
}

function normalizeLlmModelDefinition(
  scraper: string,
  schema: RawSerpRequestSchema | undefined,
  raw: RawLlmModelInfoEnvelope['data']
): LlmModelDefinition {
  const parameterEntries = Object.entries(schema?.properties ?? {});
  const parameters: SerpParameterDefinition[] = parameterEntries.map(([name, definition]) => ({
    name,
    type: normalizeType(definition.type),
    required: Boolean(definition.must),
    group: definition.class_name?.trim() || 'General',
    description: definition.description?.trim(),
    defaultValue: definition.default,
    enumValues: definition.enum
  }));

  return {
    scraper,
    name: raw?.name?.trim() || scraper,
    engine: raw?.engine?.trim() || scraper,
    description: raw?.desc?.trim(),
    website: raw?.website?.trim(),
    websiteUrl: raw?.website_url?.trim(),
    formats: Array.isArray(raw?.format) ? raw?.format.filter((value): value is string => typeof value === 'string') : [],
    version: raw?.version?.trim(),
    parameters: parameters.sort((a, b) => {
      if (a.required !== b.required) {
        return a.required ? -1 : 1;
      }

      if (a.group !== b.group) {
        return a.group.localeCompare(b.group);
      }

      return a.name.localeCompare(b.name);
    })
  };
}

function normalizeType(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return 'string';
  }

  return value.trim();
}
