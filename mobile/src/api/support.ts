import client from './client';

export interface BugReportInput {
  title: string;
  description: string;
  steps_to_reproduce: string;
  screenshot_url?: string | null;
  device_info: string;
  app_version: string;
}

export interface FeatureSuggestionInput {
  title: string;
  description: string;
  expected_benefit: string;
  priority: string;
}

export const supportApi = {
  submitBugReport: async (data: BugReportInput): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>('/api/profile/bug-report', data);
    return response.data;
  },

  submitFeatureSuggestion: async (data: FeatureSuggestionInput): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>('/api/profile/feature-request', data);
    return response.data;
  },
};
