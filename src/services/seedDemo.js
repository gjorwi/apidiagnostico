import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Cie10 } from '../models/Cie10.js';
import { RegistroEpidemiologico } from '../models/RegistroEpidemiologico.js';
import { sembrarCie10Demo } from './cie10Demo.js';
import {
  SEXOS,
  TIPOS_ATENCION,
  calcularGrupoEtario,
  calcularSemanaEpidemiologica,
  aFechaLocal,
} from '@diag/shared';

export const PASSWORD_DEMO = 'Demo1234';

const USUARIOS_DEMO = [
  { nombre: 'Digitador Demo', email: 'digitador@diagnosticos.local', rol: 'digitador' },
  { nombre: 'Analista Demo', email: 'analista@diagnosticos.local', rol: 'analista' },
  { nombre: 'Supervisor Demo', email: 'supervisor@diagnosticos.local', rol: 'supervisor' },
];

const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const elegir = (lista) => lista[aleatorio(0, lista.length - 1)];

export async function asegurarUsuariosDemo() {
  const usuarios = {};
  for (const demo of USUARIOS_DEMO) {
    let usuario = await User.findOne({ email: demo.email });
    if (!usuario) {
      const passwordHash = await User.hashPassword(PASSWORD_DEMO);
      usuario = await User.create({ ...demo, passwordHash });
    }
    usuarios[demo.rol] = usuario;
  }

  let admin = await User.findOne({ email: env.adminEmail.toLowerCase() });
  if (!admin) {
    const passwordHash = await User.hashPassword(env.adminPassword);
    admin = await User.create({
      nombre: 'Administrador',
      email: env.adminEmail.toLowerCase(),
      passwordHash,
      rol: 'admin',
    });
  }
  usuarios.admin = admin;
  return usuarios;
}

export async function generarRegistrosDemo(cantidad = 400) {
  const usuarios = await asegurarUsuariosDemo();
  await sembrarCie10Demo();

  const catalogo = await Cie10.find({ activo: true }).select('codigo descripcion').lean();
  if (!catalogo.length) throw new Error('El catálogo CIE-10 está vacío');

  const hoy = aFechaLocal(new Date());
  const documentos = [];

  for (let i = 0; i < cantidad; i += 1) {
    const diasAtras = aleatorio(0, 84);
    const fecha = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() - diasAtras,
      aleatorio(8, 20),
      aleatorio(0, 59)
    );
    const calculo = calcularSemanaEpidemiologica(fecha);
    const edad = Math.random() < 0.08 ? 0 : aleatorio(1, 95);
    const diagnostico = elegir(catalogo);

    documentos.push({
      sexo: elegir(SEXOS),
      edad,
      grupoEtario: calcularGrupoEtario(edad),
      cie10: { codigo: diagnostico.codigo, descripcion: diagnostico.descripcion },
      tipoAtencion: elegir(TIPOS_ATENCION),
      fechaAtencion: fecha,
      semanaEpidemiologica: calculo.semanaEpidemiologica,
      anioEpidemiologico: calculo.anioEpidemiologico,
      anio: calculo.anio,
      mes: calculo.mes,
      creadoPor: usuarios.digitador._id,
    });
  }

  await RegistroEpidemiologico.insertMany(documentos, { ordered: false });
  return { registros: documentos.length, usuarios };
}
