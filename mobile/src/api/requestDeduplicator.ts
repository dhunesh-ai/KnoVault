import client from './client';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

const inFlightRequests = new Map<string, Promise<any>>();

/**
 * deduplicatedGet
 * Deduplicates in-flight GET requests for the exact same URL and parameters.
 * If a request is currently pending, returns the active Promise instead of
 * starting duplicate HTTP network calls.
 */
export const deduplicatedGet = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  const cacheKey = `GET:${url}:${JSON.stringify(config?.params || {})}`;

  if (inFlightRequests.has(cacheKey)) {
    console.log(`[RequestDeduplicator] Reusing active in-flight request for: ${url}`);
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = client.get<T>(url, config)
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
};
