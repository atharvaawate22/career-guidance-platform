export interface Guide {
  id: string;
  title: string;
  description: string;
  file_url: string;
  is_active: boolean;
  created_at: Date;
}

export interface GuideDownloadRequest {
  guide_id: string;
  name: string;
  email: string;
  percentile?: number;
}

export interface GuideDownloadResponse {
  success: boolean;
  data?: {
    file_url: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateGuideRequest {
  title: string;
  description: string;
  file_url: string;
}
