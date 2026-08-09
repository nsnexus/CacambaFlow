import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/server';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  const providedSecret = request.headers.get('x-seed-secret');
  if (!process.env.SEED_SECRET || providedSecret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: 'email e password são obrigatórios' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'password precisa de pelo menos 8 caracteres' }, { status: 400 });
  }

  try {
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

    // Custom claim de tenant no token — as regras do Firestore leem daqui
    // (request.auth.token.tenant_id) em vez de get() no profile.
    await adminAuth.setCustomUserClaims(userRecord.uid, { tenant_id: 'tenant-admin' });

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
      message: 'Usuário Admin criado/atualizado com sucesso.',
      email: email
    });
  } catch (error: any) {
    console.warn('seed route falhou', error.message);
    return NextResponse.json({ success: false, error: 'Falha ao criar usuário admin.' }, { status: 500 });
  }
}
