export interface Update {
  id: string;
  title: string;
  content: string;
  published_date: string;
  edited_at?: string;
  source_url?: string | null;
}
