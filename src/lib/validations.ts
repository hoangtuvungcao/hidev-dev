import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const passwordSchema = z.string()
  .min(12, 'Mật khẩu phải có ít nhất 12 ký tự')
  .max(100, 'Mật khẩu không được vượt quá 100 ký tự')
  .refine(
    (val) => {
      if (val.length >= 20) return true;
      const hasLower = /[a-z]/.test(val);
      const hasUpper = /[A-Z]/.test(val);
      const hasDigit = /[0-9]/.test(val);
      const hasSpecial = /[^A-Za-z0-9]/.test(val);
      return hasLower && hasUpper && hasDigit && hasSpecial;
    },
    {
      message: 'Mật khẩu ngắn (12-19 ký tự) phải chứa chữ hoa, chữ thường, chữ số và ký tự đặc biệt. Hoặc sử dụng mật khẩu dài từ 20 ký tự trở lên.',
    }
  );

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
});

// Helper coercible schema for numeric IDs (accepts string or number)
const numericCoercible = z.union([
  z.number().int(),
  z.string().regex(/^\d+$/).transform(val => parseInt(val, 10))
]);

// Post schemas
export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  summary: z.string().min(1, 'Summary is required').max(500),
  link: z.string().url('Invalid URL').max(255),
  content: z.string().min(1, 'Content is required'),
  categoryId: numericCoercible.pipe(z.number().int().positive('Category ID must be a positive integer')),
  thumbnail: z.string().max(3000, 'Đường dẫn ảnh quá dài (tối đa 3000 ký tự)').optional().nullable(),
});

export const updatePostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  summary: z.string().min(1, 'Summary is required').max(500),
  link: z.string().url('Invalid URL').max(255),
  content: z.string().min(1, 'Content is required'),
  category_id: numericCoercible.pipe(z.number().int().positive('Category ID must be a positive integer')),
  thumbnail: z.string().max(3000, 'Đường dẫn ảnh quá dài (tối đa 3000 ký tự)').optional().nullable(),
});

export const updatePostStatusSchema = z.object({
  id: numericCoercible.pipe(z.number().int().positive('Post ID must be a positive integer')),
  status: z.enum(['approved', 'pending', 'rejected']),
});

// Comment schemas
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000),
  parentId: z.union([
    z.number().int(),
    z.string().regex(/^\d+$/).transform(val => parseInt(val, 10))
  ]).nullable().optional(),
});

export const updateCommentSchema = z.object({
  commentId: numericCoercible.pipe(z.number().int().positive('Comment ID must be a positive integer')),
  content: z.string().min(1, 'Comment content is required').max(5000),
});

export const deleteCommentSchema = z.object({
  commentId: numericCoercible.pipe(z.number().int().positive('Comment ID must be a positive integer')),
});

// Settings schemas
const allowedSettingKeys = [
  'site_name',
  'site_domain',
  'site_email',
  'site_phone',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'site_logo',
  'site_icon',
  'footer_text',
] as const;

export const updateSettingsSchema = z.object(
  Object.fromEntries(
    allowedSettingKeys.map(key => [key, z.string().optional()])
  )
);

// User profile schema
export const updateProfileSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().max(3000, 'Đường dẫn ảnh quá dài (tối đa 3000 ký tự)').optional().nullable(),
});

// ============================================================
// Document Module Schemas
// ============================================================

const docTypeEnum = z.enum(['de_thi', 'de_cuong', 'slide', 'giao_trinh', 'tai_lieu_tham_khao', 'bao_cao', 'nghien_cuu', 'khac']);
const semesterEnum = z.enum(['1', '2', 'he']);
const resourceTypeEnum = z.enum(['upload_file', 'external_link', 'git_repository', 'cloud_storage', 'documentation', 'demo_website', 'video', 'api_endpoint', 'project']);
const linkProviderEnum = z.enum([
  'upload', 'google_drive', 'onedrive', 'dropbox', 'mediafire', 'mega',
  'github_release', 'github_repo', 'gitlab', 'huggingface',
  'cloudflare_r2', 'aws_s3', 'backblaze_b2', 'bunny_storage',
  'wasabi', 'minio', 'archive_org', 'sourceforge', 'direct_url', 'other',
]);
const linkTypeEnum = z.enum(['primary', 'mirror_1', 'mirror_2', 'mirror_3']);

const documentLinkSchema = z.object({
  url: z.string().min(1, 'URL is required').max(2000),
  provider: linkProviderEnum.optional().default('direct_url'),
  link_type: linkTypeEnum.optional().default('primary'),
  label: z.string().max(255).optional().nullable(),
});

const documentMetadataFields = {
  resource_type: resourceTypeEnum.optional().default('upload_file'),
  version: z.string().max(50).optional().nullable(),
  language: z.string().max(50).optional().nullable(),
  framework: z.string().max(100).optional().nullable(),
  license: z.string().max(100).optional().nullable(),
  os_support: z.string().max(200).optional().nullable(),
  architecture: z.string().max(100).optional().nullable(),
  maintainer: z.string().max(100).optional().nullable(),
  homepage: z.string().max(500).optional().nullable(),
  official_website: z.string().max(500).optional().nullable(),
  repository_url: z.string().max(500).optional().nullable(),
  issues_url: z.string().max(500).optional().nullable(),
  documentation_url: z.string().max(500).optional().nullable(),
  demo_url: z.string().max(500).optional().nullable(),
  checksum_sha256: z.string().max(64).optional().nullable(),
  checksum_md5: z.string().max(32).optional().nullable(),
  total_file_size: z.number().int().min(0).optional().default(0),
  release_date: z.string().max(20).optional().nullable(),
  links: z.array(documentLinkSchema).optional().default([]),
  doc_categories: z.array(z.string().max(100)).optional().default([]),
};

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Tên tài liệu / dự án là bắt buộc').max(255),
  course_code: z.string().max(50).optional().nullable(),
  academic_year: z.string().max(20).optional().nullable(),
  semester: semesterEnum.optional().nullable(),
  doc_type: docTypeEnum,
  description: z.string().max(5000).optional().nullable(),
  sharer_name: z.string().max(100).optional().nullable(),
  major: z.string().max(100).optional().default('Công nghệ Thông tin'),
  tags: z.array(z.string().max(50)).optional().default([]),
  images: z.array(z.object({
    image_url: z.string().min(1),
    sort_order: z.number().int().min(0).default(0),
  })).optional().default([]),
  files: z.array(z.object({
    file_name: z.string().min(1),
    file_url: z.string().min(1),
    file_size: z.number().int().min(0).default(0),
    file_type: z.string().min(1),
  })).optional().default([]),
  ...documentMetadataFields,
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Tên tài liệu / dự án là bắt buộc').max(255),
  course_code: z.string().max(50).optional().nullable(),
  academic_year: z.string().max(20).optional().nullable(),
  semester: semesterEnum.optional().nullable(),
  doc_type: docTypeEnum,
  description: z.string().max(5000).optional().nullable(),
  sharer_name: z.string().max(100).optional().nullable(),
  major: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).optional().default([]),
  images: z.array(z.object({
    image_url: z.string().min(1),
    sort_order: z.number().int().min(0).default(0),
  })).optional().default([]),
  files: z.array(z.object({
    file_name: z.string().min(1),
    file_url: z.string().min(1),
    file_size: z.number().int().min(0).default(0),
    file_type: z.string().min(1),
  })).optional().default([]),
  ...documentMetadataFields,
});

export const updateDocumentStatusSchema = z.object({
  id: numericCoercible.pipe(z.number().int().positive()),
  status: z.enum(['approved', 'pending', 'rejected', 'hidden']),
});

// Helper to validate request body
export async function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await schema.parseAsync(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((e: z.ZodIssue) => e.message).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}
