import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getAuthUserId } from '@/modules/auth/data/auth';

export default async function SignInLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isSsoCallback = pathname.includes('/sso-callback');

  if (!isSsoCallback) {
    const userId = await getAuthUserId();
    if (userId) redirect('/');
  }

  return <>{children}</>;
}
