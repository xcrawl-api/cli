import { ApiError, ValidationError } from '../core/errors';
import type {
  ApiTransport,
  RawScraperInfoEnvelope,
  RawScraperListEnvelope,
  RawScraperResponseField,
  RawSerpRequestSchema,
  ScraperDefinition,
  ScraperRequest,
  ScraperResponse,
  ScraperResponseField,
  ScraperSummary,
  SerpParameterDefinition
} from '../types/api';

const SCRAPER_METADATA_TYPE = 6;
const SCRAPER_LIST_PATH = '/web_v1/scraping/xcrawl';
const SCRAPER_INFO_PATH = '/web_v1/scraping/xcrawl-info';

export async function listScrapers(client: ApiTransport): Promise<ScraperSummary[]> {
  const raw = await client.get<RawScraperListEnvelope>(SCRAPER_LIST_PATH, {
    query: { type: SCRAPER_METADATA_TYPE }
  });

  if (raw.code !== 200 || !raw.data?.list) {
    throw new ValidationError(
      'Unable to load web scrapers.',
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

export async function getScraperDefinition(client: ApiTransport, scraper: string): Promise<ScraperDefinition> {
  try {
    const raw = await client.get<RawScraperInfoEnvelope>(SCRAPER_INFO_PATH, {
      query: {
        scraper,
        type: SCRAPER_METADATA_TYPE
      }
    });

    if (raw.code !== 200 || !raw.data) {
      throw new ValidationError(
        `Unsupported scraper: ${scraper}.`,
        'Run `xcrawl scraper --list-scrapers` to inspect supported scrapers.'
      );
    }

    return normalizeScraperDefinition(scraper, raw.data.request_params, raw.data);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    if (error instanceof ApiError && error.status === 404) {
      throw new ValidationError(
        `Unsupported scraper: ${scraper}.`,
        'Run `xcrawl scraper --list-scrapers` to inspect supported scrapers.',
        error
      );
    }

    throw error;
  }
}

export async function runScraper(client: ApiTransport, request: ScraperRequest): Promise<ScraperResponse> {
  return client.post<ScraperResponse>('/v1/data', {
    body: {
      engine: request.engine,
      ...request.params
    }
  });
}

function normalizeScraperDefinition(
  scraper: string,
  schema: RawSerpRequestSchema | undefined,
  raw: RawScraperInfoEnvelope['data']
): ScraperDefinition {
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
    }),
    responseFields: flattenResponseFields(raw?.response_dict ?? []),
    responseExample: raw?.response_example
  };
}

function flattenResponseFields(
  fields: RawScraperResponseField[],
  parentPath = ''
): ScraperResponseField[] {
  return fields.flatMap((field) => {
    const fieldName = field.name?.trim();
    const fieldType = normalizeType(field.type);
    const path = buildFieldPath(parentPath, fieldName, fieldType);
    const current = path
      ? [
          {
            path,
            type: fieldType,
            description: field.desc?.trim()
          }
        ]
      : [];

    const nextPath = path || parentPath;
    const nested = field.sub ? flattenResponseFields(field.sub, nextPath) : [];

    return [...current, ...nested];
  });
}

function buildFieldPath(parentPath: string, fieldName: string | undefined, fieldType: string): string {
  if (!fieldName) {
    return parentPath;
  }

  const suffix = fieldType === 'list' ? '[]' : '';
  return parentPath ? `${parentPath}.${fieldName}${suffix}` : `${fieldName}${suffix}`;
}

function normalizeType(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return 'string';
  }

  return value.trim();
}
