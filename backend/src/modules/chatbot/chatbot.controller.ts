import { Request, Response, NextFunction } from 'express';
import * as chatbotService from './chatbot.service';

/** Website adapter — thin translation of HTTP <-> the shared decision service. No chatbot logic lives here. */
export async function postMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { message } = req.body as { message: string };
    const reply = await chatbotService.getReply(message, 'website');
    res.json({ success: true, data: reply });
  } catch (error) {
    next(error);
  }
}
