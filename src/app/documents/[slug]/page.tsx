import { Metadata } from 'next';
import { getDocumentBySlug, incrementViewCount } from '@/lib/documents';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DocumentDetailClient from './document-detail-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocumentBySlug(slug);
  if (!doc) return { title: 'Document Not Found' };

  return {
    title: `${doc.title} - Tài liệu học tập`,
    description: doc.description || `${doc.title} - ${doc.course_code || ''} - Tài liệu dành cho sinh viên CNTT`,
    openGraph: {
      title: doc.title,
      description: doc.description || doc.title,
      images: doc.images?.[0]?.image_url ? [doc.images[0].image_url] : [],
    },
  };
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getDocumentBySlug(slug);
  if (!doc || (doc.status !== 'approved' && doc.status !== 'pending')) {
    notFound();
  }

  // Increment view
  await incrementViewCount(doc.id);

  const user = await getCurrentUser();

  return <DocumentDetailClient document={doc} currentUser={user} />;
}
