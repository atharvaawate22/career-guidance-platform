import * as guidesRepository from './guides.repository';
import {
  Guide,
  GuideDownloadRequest,
  GuideDownloadResponse,
  CreateGuideRequest,
} from './guides.types';

export async function getActiveGuides(): Promise<Guide[]> {
  return await guidesRepository.getActiveGuides();
}

export async function downloadGuide(
  downloadRequest: GuideDownloadRequest,
): Promise<GuideDownloadResponse> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(downloadRequest.email)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      },
    };
  }

  // Validate percentile if provided
  if (downloadRequest.percentile !== undefined) {
    if (downloadRequest.percentile < 0 || downloadRequest.percentile > 100) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Percentile must be between 0 and 100',
        },
      };
    }
  }

  // Check if guide exists and is active
  const guide = await guidesRepository.getGuideById(downloadRequest.guide_id);
  if (!guide) {
    return {
      success: false,
      error: {
        code: 'GUIDE_NOT_FOUND',
        message: 'Guide not found',
      },
    };
  }

  if (!guide.is_active) {
    return {
      success: false,
      error: {
        code: 'GUIDE_UNAVAILABLE',
        message: 'Guide is not available',
      },
    };
  }

  // Record the download
  await guidesRepository.recordDownload(downloadRequest);

  return {
    success: true,
    data: {
      file_url: guide.file_url,
    },
  };
}

export async function createGuide(guide: CreateGuideRequest): Promise<Guide> {
  // Validate required fields
  if (!guide.title || !guide.description || !guide.file_url) {
    throw new Error('Title, description, and file_url are required');
  }

  return await guidesRepository.createGuide(guide);
}
