require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

const auth = admin.auth();
const db = admin.firestore();

async function seed() {
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail('admin@cacambaflow.com');
      console.log('Usuário Auth já existe:', userRecord.uid);
      
      await auth.updateUser(userRecord.uid, { password: 'password123' });
    } catch (e) {
      userRecord = await auth.createUser({
        email: 'admin@cacambaflow.com',
        password: 'password123',
        displayName: 'Administrador',
      });
      console.log('Usuário Auth criado:', userRecord.uid);
    }

    const tenantRef = db.collection('tenants').doc('tenant-admin');
    await tenantRef.set({
      name: 'CaçambaFlow Matriz',
      document: '00.000.000/0001-00',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection('profiles').doc(userRecord.uid).set({
      email: 'admin@cacambaflow.com',
      full_name: 'Administrador',
      role: 'ADMIN',
      tenant_id: 'tenant-admin',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('Seed completo com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro no seed:', error);
    process.exit(1);
  }
}
seed();
