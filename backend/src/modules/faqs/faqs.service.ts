import * as faqRepository from './faqs.repository';
import { CreateFaqRequest, Faq, UpdateFaqRequest } from './faqs.types';

export async function getActiveFaqs(): Promise<Faq[]> {
  return await faqRepository.getActiveFaqs();
}

export async function getAllFaqs(): Promise<Faq[]> {
  return await faqRepository.getAllFaqs();
}

export async function createFaq(faq: CreateFaqRequest): Promise<Faq> {
  if (!faq.question?.trim() || !faq.answer?.trim()) {
    throw new Error('question and answer are required');
  }

  const display_order =
    faq.display_order === undefined ? 0 : Number(faq.display_order);
  if (Number.isNaN(display_order) || display_order < 0) {
    throw new Error('display_order must be a non-negative number');
  }

  return await faqRepository.createFaq({
    ...faq,
    display_order,
  });
}

export async function updateFaq(
  id: string,
  faq: UpdateFaqRequest,
): Promise<Faq | null> {
  if (faq.question !== undefined && !faq.question.trim()) {
    throw new Error('question is required');
  }

  if (faq.answer !== undefined && !faq.answer.trim()) {
    throw new Error('answer is required');
  }

  if (faq.display_order !== undefined) {
    const display_order = Number(faq.display_order);
    if (Number.isNaN(display_order) || display_order < 0) {
      throw new Error('display_order must be a non-negative number');
    }
    faq.display_order = display_order;
  }

  return await faqRepository.updateFaq(id, faq);
}

export async function deleteFaq(id: string): Promise<boolean> {
  return await faqRepository.deleteFaq(id);
}

export async function toggleFaqActive(
  id: string,
  is_active: boolean,
): Promise<boolean> {
  return await faqRepository.toggleFaqActive(id, is_active);
}
