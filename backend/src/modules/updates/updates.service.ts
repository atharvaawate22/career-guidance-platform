import { Update } from './updates.types';
import { UpdatesRepository } from './updates.repository';

const updatesRepository = new UpdatesRepository();

export class UpdatesService {
  async getAllUpdates(): Promise<Update[]> {
    return await updatesRepository.getAllUpdates();
  }

  async createUpdate(update: Omit<Update, 'id'>): Promise<Update> {
    return await updatesRepository.createUpdate(update);
  }

  async updateUpdate(
    id: string,
    update: Partial<Omit<Update, 'id'>>,
  ): Promise<Update | null> {
    return await updatesRepository.updateUpdate(id, update);
  }

  async deleteUpdate(id: string): Promise<boolean> {
    return await updatesRepository.deleteUpdate(id);
  }
}
