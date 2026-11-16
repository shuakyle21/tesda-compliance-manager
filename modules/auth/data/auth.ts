import { auth, currentUser } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export async function getCurrentUser(): Promise<User | null> {
  return currentUser();
}

export async function getAuthPayload() {
  return auth();
}

export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function requireAuthenticatedUser(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) redirect('/sign-in');
  return userId;
}
