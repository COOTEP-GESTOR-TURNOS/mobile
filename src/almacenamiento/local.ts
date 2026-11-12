import * as SQLite from 'expo-sqlite';
import type { Turno } from '../api/turnos';

/**
 * SQLite local: datos no críticos para tolerar cortes de conexión (sección 5 del informe).
 * La posición real siempre se consulta al backend; esto solo muestra el último estado conocido.
 */
let conexion: Promise<SQLite.SQLiteDatabase> | null = null;

function baseDeDatos(): Promise<SQLite.SQLiteDatabase> {
  if (!conexion) {
    conexion = SQLite.openDatabaseAsync('cootep-turno.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS preferencias (clave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS ultimo_turno (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          turno_json TEXT NOT NULL,
          actualizado_en TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return conexion;
}

export const almacenLocal = {
  async guardarPreferencia(clave: string, valor: string): Promise<void> {
    const db = await baseDeDatos();
    await db.runAsync('INSERT OR REPLACE INTO preferencias (clave, valor) VALUES (?, ?)', clave, valor);
  },

  async leerPreferencia(clave: string): Promise<string | null> {
    const db = await baseDeDatos();
    const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM preferencias WHERE clave = ?', clave);
    return fila?.valor ?? null;
  },

  async guardarUltimoTurno(turno: Turno | null): Promise<void> {
    const db = await baseDeDatos();
    if (!turno) {
      await db.runAsync('DELETE FROM ultimo_turno');
      return;
    }
    await db.runAsync(
      'INSERT OR REPLACE INTO ultimo_turno (id, turno_json, actualizado_en) VALUES (1, ?, ?)',
      JSON.stringify(turno),
      new Date().toISOString(),
    );
  },

  async leerUltimoTurno(): Promise<{ turno: Turno; actualizadoEn: string } | null> {
    const db = await baseDeDatos();
    const fila = await db.getFirstAsync<{ turno_json: string; actualizado_en: string }>(
      'SELECT turno_json, actualizado_en FROM ultimo_turno WHERE id = 1',
    );
    return fila ? { turno: JSON.parse(fila.turno_json) as Turno, actualizadoEn: fila.actualizado_en } : null;
  },
};
