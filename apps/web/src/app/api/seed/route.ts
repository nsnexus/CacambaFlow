import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/server';
import * as admin from 'firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email') || 'admin@cacambaflow.com';
    const password = searchParams.get('password') || 'password123';

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      // Atualiza a senha por garantia
      await adminAuth.updateUser(userRecord.uid, { password: password });
    } catch (e) {
      userRecord = await adminAuth.createUser({
        email: email,
        password: password,
        displayName: 'Administrador',
      });
    }

    const tenantRef = adminDb.collection('tenants').doc('tenant-admin');
    await tenantRef.set({
      name: 'CaçambaFlow Matriz',
      document: '00.000.000/0001-00',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await adminDb.collection('profiles').doc(userRecord.uid).set({
      email: email,
      full_name: 'Administrador',
      role: 'ADMIN',
      tenant_id: 'tenant-admin',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return NextResponse.json({ 
      success: true, 
      message: 'Usuário Admin criado com sucesso!',
      email: email,
      password: password
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
