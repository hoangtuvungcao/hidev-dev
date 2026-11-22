export interface Setting {
  id?: number;
  key_name: string;
  value: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'moderator' | 'editor' | 'author';
  avatar_url?: string;
  bio?: string;
  website?: string;
  github?: string;
  is_verified?: boolean;
  is_banned?: boolean;
  ban_reason?: string;
  last_login_at?: string;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string;
  link: string;
  thumbnail?: string;
  author_id: number;
  category_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  
  // Custom joined fields
  username?: string;
  author_avatar?: string;
  category_name?: string;
  category_slug?: string;
  upvotes_count?: number;
  comments_count?: number;
  has_upvoted?: boolean;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
  parent_id?: number | null;
}

export interface SiteConfig {
  siteName: string;
  siteDomain: string;
  siteEmail: string;
  sitePhone: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  siteLogo: string;
  siteIcon: string;
  footerText: string;
  qrDonation?: string;
}

// ============================================================
// Document / Resource Module Types
// ============================================================

export type DocType = 'de_thi' | 'de_cuong' | 'slide' | 'giao_trinh' | 'tai_lieu_tham_khao' | 'bao_cao' | 'nghien_cuu' | 'khac';
export type Semester = '1' | '2' | 'he';
export type DocStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export type ResourceType =
  | 'upload_file'
  | 'external_link'
  | 'git_repository'
  | 'cloud_storage'
  | 'documentation'
  | 'demo_website'
  | 'video'
  | 'api_endpoint'
  | 'project';

export type LinkProvider =
  | 'upload'
  | 'google_drive'
  | 'onedrive'
  | 'dropbox'
  | 'mediafire'
  | 'mega'
  | 'github_release'
  | 'github_repo'
  | 'gitlab'
  | 'huggingface'
  | 'cloudflare_r2'
  | 'aws_s3'
  | 'backblaze_b2'
  | 'bunny_storage'
  | 'wasabi'
  | 'minio'
  | 'archive_org'
  | 'sourceforge'
  | 'direct_url'
  | 'other';

export interface DocumentLink {
  id?: number;
  document_id?: number;
  url: string;
  provider: LinkProvider;
  link_type: 'primary' | 'mirror_1' | 'mirror_2' | 'mirror_3';
  label?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface DocumentRecord {
  id: number;
  title: string;
  slug: string;
  course_code?: string;
  academic_year?: string;
  semester?: Semester;
  doc_type: DocType;
  resource_type: ResourceType;
  description?: string;
  sharer_name?: string;
  author_id: number;
  major: string;
  status: DocStatus;
  view_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  // Extended metadata
  version?: string;
  language?: string;
  framework?: string;
  license?: string;
  os_support?: string;
  architecture?: string;
  maintainer?: string;
  homepage?: string;
  official_website?: string;
  repository_url?: string;
  issues_url?: string;
  documentation_url?: string;
  demo_url?: string;
  checksum_sha256?: string;
  checksum_md5?: string;
  total_file_size?: number;
  release_date?: string;
  // Joined fields
  username?: string;
  author_avatar?: string;
  tags?: string[];
  images?: DocumentImage[];
  files?: DocumentFile[];
  links?: DocumentLink[];
  categories_list?: string[];
}

export interface DocumentImage {
  id: number;
  document_id: number;
  image_url: string;
  sort_order: number;
}

export interface DocumentFile {
  id: number;
  document_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
}

// ============================================================
// Activity Log
// ============================================================

export interface ActivityLog {
  id: number;
  user_id?: number;
  action: string;
  target_type?: string;
  target_id?: number;
  details?: string;
  ip_address?: string;
  created_at: string;
  // Joined
  username?: string;
}
