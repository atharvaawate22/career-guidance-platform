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
  if (!downloadRequest.guide_id) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Guide ID is required',
      },
    };
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

export async function getAllGuides(): Promise<Guide[]> {
  return await guidesRepository.getAllGuides();
}

export async function deleteGuide(guideId: string): Promise<boolean> {
  return await guidesRepository.deleteGuide(guideId);
}

export async function toggleGuide(
  guideId: string,
  isActive: boolean,
): Promise<Guide | null> {
  return await guidesRepository.toggleGuide(guideId, isActive);
}

export async function getDownloads(): Promise<object[]> {
  return await guidesRepository.getDownloads();
}
