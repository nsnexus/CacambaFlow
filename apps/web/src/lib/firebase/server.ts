import 'server-only';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle newline characters in the private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();

import { cookies } from 'next/headers';

export async function getServerSession() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;
  
  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    return null;
  }
}

export async function requireUserAndTenant() {
  const session = await getServerSession();
  if (!session) throw new Error('Não autenticado');

  const profileSnap = await adminDb.collection('profiles').doc(session.uid).get();
  if (!profileSnap.exists) throw new Error('Perfil não encontrado');

  const profile = profileSnap.data();
  return {
    uid: session.uid,
    tenantId: profile?.tenant_id as string,
    profileId: session.uid,
    role: profile?.role as string,
  };
}

// Gestão de múltiplas empresas (tenants) é uma visão que cruza dados de
// vários clientes — só quem for SUPER_ADMIN pode acessar, pra um admin de
// uma empresa não conseguir ver dados de outra.
export async function requireSuperAdmin() {
  const session = await requireUserAndTenant();
  if (session.role !== 'SUPER_ADMIN') throw new Error('Acesso restrito a super administradores');
  return session;
}
