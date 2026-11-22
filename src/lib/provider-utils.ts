import { LinkProvider } from '../types';

/**
 * Auto-detect cloud storage / hosting provider from a URL.
 */
export function detectProvider(url: string): LinkProvider {
  if (!url) return 'direct_url';

  const u = url.toLowerCase().trim();

  const patterns: [LinkProvider, RegExp][] = [
    ['google_drive', /drive\.google\.com|docs\.google\.com\/.*\/(d|folders)\//],
    ['onedrive', /onedrive\.live\.com|1drv\.ms|sharepoint\.com/],
    ['dropbox', /dropbox\.com|dl\.dropboxusercontent\.com/],
    ['mediafire', /mediafire\.com/],
    ['mega', /mega\.nz|mega\.co\.nz|mega\.io/],
    ['github_release', /github\.com\/[^/]+\/[^/]+\/releases/],
    ['github_repo', /github\.com\/[^/]+\/[^/]+\/?$/],
    ['gitlab', /gitlab\.com/],
    ['huggingface', /huggingface\.co/],
    ['cloudflare_r2', /r2\.cloudflarestorage\.com|r2\.dev/],
    ['aws_s3', /s3\.amazonaws\.com|\.s3\.|s3-[a-z]+-[a-z]+-\d+\.amazonaws/],
    ['backblaze_b2', /backblazeb2\.com|f\d{3}\.backblazeb2\.com/],
    ['bunny_storage', /b-cdn\.net|storage\.bunnycdn\.com/],
    ['wasabi', /wasabisys\.com|s3\.wasabisys/],
    ['minio', /minio\.|:9000\//],
    ['archive_org', /archive\.org/],
    ['sourceforge', /sourceforge\.net|sf\.net/],
  ];

  for (const [provider, regex] of patterns) {
    if (regex.test(u)) return provider;
  }

  return 'direct_url';
}

/**
 * Provider display information (label + color).
 */
export const PROVIDER_INFO: Record<LinkProvider, { label: string; color: string; shortLabel: string }> = {
  upload: { label: 'Upload File', color: '#10b981', shortLabel: 'Upload' },
  google_drive: { label: 'Google Drive', color: '#4285F4', shortLabel: 'Drive' },
  onedrive: { label: 'OneDrive', color: '#0078D4', shortLabel: 'OneDrive' },
  dropbox: { label: 'Dropbox', color: '#0061FF', shortLabel: 'Dropbox' },
  mediafire: { label: 'MediaFire', color: '#326CE5', shortLabel: 'MediaFire' },
  mega: { label: 'Mega.nz', color: '#D9272E', shortLabel: 'Mega' },
  github_release: { label: 'GitHub Release', color: '#24292e', shortLabel: 'GitHub' },
  github_repo: { label: 'GitHub Repository', color: '#24292e', shortLabel: 'GitHub' },
  gitlab: { label: 'GitLab', color: '#FC6D26', shortLabel: 'GitLab' },
  huggingface: { label: 'HuggingFace', color: '#FFD21E', shortLabel: 'HF' },
  cloudflare_r2: { label: 'Cloudflare R2', color: '#F38020', shortLabel: 'R2' },
  aws_s3: { label: 'AWS S3', color: '#FF9900', shortLabel: 'S3' },
  backblaze_b2: { label: 'Backblaze B2', color: '#E21E29', shortLabel: 'B2' },
  bunny_storage: { label: 'Bunny Storage', color: '#F5A623', shortLabel: 'Bunny' },
  wasabi: { label: 'Wasabi', color: '#56B847', shortLabel: 'Wasabi' },
  minio: { label: 'MinIO', color: '#C72C48', shortLabel: 'MinIO' },
  archive_org: { label: 'Archive.org', color: '#428bca', shortLabel: 'Archive' },
  sourceforge: { label: 'SourceForge', color: '#FF6600', shortLabel: 'SF' },
  direct_url: { label: 'Direct URL', color: '#6366f1', shortLabel: 'URL' },
  other: { label: 'Other', color: '#8b5cf6', shortLabel: 'Other' },
};

/**
 * Resource type display information (no icons, unified badge styling).
 */
export const RESOURCE_TYPE_INFO: Record<string, { vi: string; en: string; color: string }> = {
  upload_file: { vi: 'Upload File', en: 'Upload File', color: '#10b981' },
  external_link: { vi: 'Liên kết ngoài', en: 'External Link', color: '#6366f1' },
  git_repository: { vi: 'Git Repository', en: 'Git Repository', color: '#24292e' },
  cloud_storage: { vi: 'Cloud Storage', en: 'Cloud Storage', color: '#0078D4' },
  documentation: { vi: 'Tài liệu', en: 'Documentation', color: '#f59e0b' },
  demo_website: { vi: 'Website Demo', en: 'Demo Website', color: '#ec4899' },
  video: { vi: 'Video', en: 'Video', color: '#ef4444' },
  api_endpoint: { vi: 'API Endpoint', en: 'API Endpoint', color: '#8b5cf6' },
  project: { vi: 'Dự án', en: 'Project', color: '#06b6d4' },
};

/**
 * Check if a file can be previewed in browser.
 */
export function isPreviewable(fileName: string): { type: 'pdf' | 'markdown' | 'text' | 'image' | 'video' | 'code' | null } {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf') return { type: 'pdf' };
  if (['md', 'markdown'].includes(ext)) return { type: 'markdown' };
  if (['txt', 'log', 'csv'].includes(ext)) return { type: 'text' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return { type: 'image' };
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return { type: 'video' };
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h', 'cs', 'rb', 'php', 'html', 'css', 'scss', 'json', 'yaml', 'yml', 'xml', 'sql', 'sh', 'bash', 'dockerfile', 'makefile', 'toml', 'ini', 'cfg'].includes(ext)) {
    return { type: 'code' };
  }

  return { type: null };
}

/**
 * Format file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Build download URL with tracking (through our API).
 */
export function buildDownloadUrl(docId: number, linkId?: number): string {
  if (linkId) {
    return `/api/documents/${docId}/download?link=${linkId}`;
  }
  return `/api/documents/${docId}/download`;
}
