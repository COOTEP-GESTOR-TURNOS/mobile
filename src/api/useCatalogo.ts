import { useCallback, useEffect, useState } from 'react';
import { almacenLocal } from '../almacenamiento/local';
import { type AgenciaCatalogo, catalogoApi } from './catalogo';
import { mensajeDeError } from './http';

/** Una sola consulta del catálogo para todas las pantallas que lo usan. */
let enCurso: Promise<AgenciaCatalogo[]> | null = null;

function cargarCatalogo(): Promise<AgenciaCatalogo[]> {
  enCurso ??= catalogoApi
    .agencias()
    .then(async (agencias) => {
      const lista = agencias ?? [];
      // Copia en SQLite: sin conexión, los nombres de agencia y fila se siguen viendo.
      await almacenLocal.guardarPreferencia('catalogo', JSON.stringify(lista)).catch(() => undefined);
      return lista;
    })
    .catch((error: unknown) => {
      enCurso = null;
      throw error;
    });
  return enCurso;
}

export function useCatalogo() {
  const [agencias, setAgencias] = useState<AgenciaCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** true cuando se muestra la copia local porque la API no respondió. */
  const [desdeCopia, setDesdeCopia] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    cargarCatalogo()
      .then((lista) => {
        setAgencias(lista);
        setDesdeCopia(false);
      })
      .catch(async (err: unknown) => {
        const copia = await almacenLocal.leerPreferencia('catalogo').catch(() => null);
        if (copia) {
          setAgencias(JSON.parse(copia) as AgenciaCatalogo[]);
          setDesdeCopia(true);
        } else {
          setError(mensajeDeError(err, 'No se pudo cargar el catálogo de agencias'));
        }
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(cargar, [cargar]);

  return { agencias, cargando, error, desdeCopia, reintentar: cargar };
}
