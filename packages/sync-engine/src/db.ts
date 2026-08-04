import * as SQLite from 'expo-sqlite';

export class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;

    // Expo SQLite v14 syntax
    this.db = await SQLite.openDatabaseAsync('cacambaflow_offline.db');

    // Habilita chaves estrangeiras e WAL mode (Write-Ahead Logging)
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);

    // Cria as tabelas necessárias para cache local e fila (outbox)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        occurred_at_device TEXT NOT NULL,
        payload TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      );

      -- Cache das entidades (somente leitura no app)
      CREATE TABLE IF NOT EXISTS local_jobs (
        id TEXT PRIMARY KEY,
        job_number TEXT NOT NULL,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL,
        raw_data TEXT NOT NULL, -- JSON completo vindo do supabase
        updated_at TEXT NOT NULL
      );
    `);

    return this.db;
  }

  async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      return this.init();
    }
    return this.db;
  }
}

export const localDb = new LocalDatabase();
