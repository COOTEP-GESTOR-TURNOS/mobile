import { useEffect, useState } from 'react';
import { filtrosAnaliticaApi, type OpcionesAnalitica, type RangoAnalitica } from './filtrosAnalitica';
import { mensajeDeError } from './http';

type Consulta = { clave: string; datos?: OpcionesAnalitica; error?: string };

export function useFiltrosAnalitica(agenciaId: string | null, { desde, hasta }: RangoAnalitica) {
  const [servicioElegido, elegirServicio] = useState('');
  const [colaboradorElegido, elegirColaborador] = useState('');
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState<Consulta | null>(null);
  const clave = JSON.stringify([agenciaId, desde, hasta, servicioElegido, revision]);
  const consulta = consultaVigente(resultado, clave, agenciaId);
  const opciones = consulta?.datos;
  const { servicio, colaborador } = elegidos(opciones, servicioElegido, colaboradorElegido);

  useEffect(() => {
    if (agenciaId === null) return;
    let vigente = true;
    filtrosAnaliticaApi.consultar({ desde, hasta, agenciaId, servicioId: servicioElegido })
      .then((datos) => {
        if (!datos) throw new Error('Respuesta vacía');
        if (vigente) setResultado({ clave, datos });
      })
      .catch((error: unknown) => {
        if (vigente) setResultado({ clave, error: mensajeDeError(error, 'No se pudieron cargar los filtros') });
      });
    return () => { vigente = false; };
  }, [agenciaId, desde, hasta, servicioElegido, clave]);

  useEffect(() => {
    if (!opciones) return;
    if (servicioElegido && !servicio) {
      elegirServicio('');
      return;
    }
    if (colaboradorElegido && !colaborador) elegirColaborador('');
  }, [opciones, servicioElegido, servicio, colaboradorElegido, colaborador]);

  return {
    opciones,
    servicio,
    colaborador,
    elegirServicio,
    elegirColaborador,
    listos: filtrosListos(servicioElegido, servicio, colaboradorElegido, colaborador),
    cargando: agenciaId !== null && !consulta,
    error: consulta?.error,
    reintentar: () => setRevision((version) => version + 1),
  };
}

/** La consulta guardada solo vale si corresponde a la agencia, el rango y el servicio actuales. */
function consultaVigente(resultado: Consulta | null, clave: string, agenciaId: string | null): Consulta | null {
  return agenciaId !== null && resultado?.clave === clave ? resultado : null;
}

/** El servicio y el colaborador elegidos, si siguen entre las opciones disponibles. */
function elegidos(opciones: OpcionesAnalitica | undefined, servicioId: string, colaboradorId: string) {
  return {
    servicio: opciones?.servicios.find(({ id }) => id === servicioId),
    colaborador: opciones?.colaboradores.find(({ id }) => id === colaboradorId),
  };
}

/** Listos para consultar: cada filtro elegido ya se encontró entre las opciones. */
function filtrosListos(servicioElegido: string, servicio: unknown, colaboradorElegido: string, colaborador: unknown): boolean {
  return (!servicioElegido || Boolean(servicio)) && (!colaboradorElegido || Boolean(colaborador));
}
