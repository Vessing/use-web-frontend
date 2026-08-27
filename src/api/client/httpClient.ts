import { apiConfig } from './apiConfig';
import { toApiClientError } from './apiError';

export interface HttpClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface HttpClient {
  get<TResponse>(path: string): Promise<TResponse>;
  post<TResponse, TRequest = unknown>(path: string, body?: TRequest): Promise<TResponse>;
  put<TResponse, TRequest = unknown>(path: string, body: TRequest): Promise<TResponse>;
  delete<TResponse>(path: string): Promise<TResponse>;
}

interface JsonRequestOptions<TRequest> {
  method: string;
  headers?: HeadersInit;
  body?: TRequest;
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const baseUrl = stripTrailingSlash(options.baseUrl ?? apiConfig.baseUrl);
  const fetchFn = options.fetchFn ?? fetch.bind(globalThis);

  async function request<TResponse, TRequest = unknown>(
    path: string,
    init: JsonRequestOptions<TRequest>,
  ): Promise<TResponse> {
    const response = await fetchFn(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    const data = await readResponseBody(response);

    if (!response.ok) {
      throw toApiClientError(response.status, data, {
        path,
        message: response.statusText || 'Request failed.',
      });
    }

    return data as TResponse;
  }

  return {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    delete: (path) => request(path, { method: 'DELETE' }),
  };
}

export const httpClient = createHttpClient();

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw toApiClientError(response.status, undefined, {
      code: 'INVALID_JSON_RESPONSE',
      message: 'The backend returned invalid JSON.',
      userMessage: 'The server response could not be read.',
    });
  }
}

function stripTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
