import { useCallback, useEffect, useState } from 'react';
import { demandaApi, type TableroMensual } from './demanda';
import { mensajeDeError } from './http';

type Consulta = { clave: string; datos: TableroMensual | null; error: string | null };

export function useTableroMensual(mes: string, agenciaId: string | null, servicioId?: string, colaboradorId?: string) {
  const [resultado, setResultado] = useState<Consulta | null>(null);
  const [revision, setRevision] = useState(0);
  const recargar = useCallback(() => setRevision((version) => version + 1), []);
  const clave = JSON.stringify([agenciaId, mes, servicioId, colaboradorId]);

  useEffect(() => {
    if (agenciaId === null) return;
    let vigente = true;

    async function cargar(agencia: string) {
      try {
        const datos = await demandaApi.tablero(mes, agencia, { servicioId, colaboradorId });
        if (!datos) throw new Error('Respuesta vacía');
        if (vigente) setResultado({ clave, datos, error: null });
      } catch (err) {
        if (vigente) {
          const error = mensajeDeError(err, 'No se pudo cargar el tablero mensual');
          setResultado((previo) => ({ clave, datos: previo?.clave === clave ? previo.datos : null, error }));
        }
      }
    }

    void cargar(agenciaId);
    return () => {
      vigente = false;
    };
  }, [agenciaId, clave, mes, servicioId, colaboradorId, revision]);

  return { ...estadoTablero(resultado, clave, agenciaId), recargar };
}

/** La consulta guardada solo vale si corresponde a la agencia, el mes y los filtros actuales. */
function consultaVigente(resultado: Consulta | null, clave: string, agenciaId: string | null): Consulta | null {
  return agenciaId !== null && resultado?.clave === clave ? resultado : null;
}

function estadoTablero(resultado: Consulta | null, clave: string, agenciaId: string | null) {
  const consulta = consultaVigente(resultado, clave, agenciaId);
  return { datos: consulta?.datos ?? null, error: consulta?.error ?? null, cargando: agenciaId !== null && !consulta };
}
