import api from './api';

interface FeatureFlags {
  enableDepartments: boolean;
  enableOrganizations: boolean;
  enablePlayerRecord: boolean;
  enableTimeclock: boolean;
}

let cachedFeatures: FeatureFlags | null = null;

export async function getFeatureFlags(): Promise<FeatureFlags> {
  if (cachedFeatures !== null) {
    return cachedFeatures;
  }

  try {
    const response = await api.get('/health');
    const features = response.data.features as FeatureFlags;
    cachedFeatures = features;
    return features;
  } catch (error) {
    console.error('Failed to fetch feature flags:', error);
    // Default to enabled if we can't fetch flags
    return {
      enableDepartments: true,
      enableOrganizations: true,
      enablePlayerRecord: true,
      enableTimeclock: true
    };
  }
} 