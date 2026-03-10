export interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  is_active: boolean;
  created_at: Date;
}

export interface CreateResourceRequest {
  title: string;
  description: string;
  file_url: string;
  category: string;
}
