import * as resourcesRepository from './resources.repository';
import { Resource, CreateResourceRequest } from './resources.types';

export async function getActiveResources(category?: string): Promise<Resource[]> {
  return await resourcesRepository.getActiveResources(category);
}

export async function createResource(resource: CreateResourceRequest): Promise<Resource> {
  if (!resource.title?.trim() || !resource.description?.trim() || !resource.file_url?.trim() || !resource.category?.trim()) {
    throw new Error('title, description, file_url, and category are all required');
  }
  return await resourcesRepository.createResource(resource);
}

export async function deleteResource(id: string): Promise<boolean> {
  return await resourcesRepository.deleteResource(id);
}

export async function toggleResourceActive(id: string, is_active: boolean): Promise<boolean> {
  return await resourcesRepository.toggleResourceActive(id, is_active);
}
