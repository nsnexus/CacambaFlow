'use server';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/server';

export async function setSessionCookie(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const options = {
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
    cookies().set(options);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Unauthorized' };
  }
}

export async function clearSessionCookie() {
  cookies().delete('session');
  return { success: true };
}
