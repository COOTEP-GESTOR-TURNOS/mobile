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
  const consulta = agenciaId !== null && resultado?.clave === clave ? resultado : null;
  const opciones = consulta?.datos;
  const servicio = opciones?.servicios.find(({ id }) => id === servicioElegido);
  const colaborador = opciones?.colaboradores.find(({ id }) => id === colaboradorElegido);

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
    listos: (!servicioElegido || !!servicio) && (!colaboradorElegido || !!colaborador),
    cargando: agenciaId !== null && !consulta,
    error: consulta?.error,
    reintentar: () => setRevision((version) => version + 1),
  };
}
