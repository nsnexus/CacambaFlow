import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/server';

export async function GET() {
  try {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session cookie' });
    }
    
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    const profileSnap = await adminDb.collection('profiles').doc(decoded.uid).get();
    
    return NextResponse.json({ 
      uid: decoded.uid,
      profileExists: profileSnap.exists,
      profileData: profileSnap.data(),
      success: true
    });
  } catch (error: any) {
    console.warn('debug route falhou', error.name);
    return NextResponse.json({ error: 'Falha ao verificar sessão.' }, { status: 500 });
  }
}
