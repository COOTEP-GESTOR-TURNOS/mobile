import { StyleSheet, Text, View } from 'react-native';
import { useSesion } from '../sesion';
import { colores, espacio, texto } from '../tema/tokens';

/** CU-05 y CU-06. Pendiente: las mismas secciones del panel web de administración. */
export function Administracion() {
  const { usuario } = useSesion();
  const esSuperadmin = usuario?.roles.some((r) => r.rol === 'SUPERADMIN');
  const pendientes = [
    ...(esSuperadmin ? ['Administradores de agencia', 'Parámetros globales'] : []),
    'Servicios, ventanillas y horario',
    'Funcionarios',
    'Indicadores',
    'Auditoría',
  ];
  return (
    <View>
      <Text style={estilos.titulo}>{esSuperadmin ? 'Control global' : 'Administración de la agencia'}</Text>
      <Text style={estilos.texto}>Secciones pendientes de implementar:</Text>
      {pendientes.map((p) => (
        <Text key={p} style={estilos.texto}>
          • {p}
        </Text>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto, marginBottom: espacio[3] },
  texto: { fontSize: texto.md, color: colores.texto, marginTop: espacio[1] },
});
