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
    return NextResponse.json({ 
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    }, { status: 500 });
  }
}
