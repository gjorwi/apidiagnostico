import { normalizarTexto } from '@diag/shared';
import { Cie10 } from '../models/Cie10.js';

export const CODIGOS_DEMO = [
  ['A09', 'Diarrea y gastroenteritis de presunto origen infeccioso'],
  ['A15.0', 'Tuberculosis pulmonar, confirmada por microscopía de esputo'],
  ['A90', 'Dengue clásico'],
  ['B34.9', 'Infección viral, no especificada'],
  ['E10', 'Diabetes mellitus tipo 1'],
  ['E11', 'Diabetes mellitus tipo 2'],
  ['E11.9', 'Diabetes mellitus tipo 2 sin complicaciones'],
  ['E78.5', 'Hiperlipidemia, no especificada'],
  ['F32.9', 'Episodio depresivo, no especificado'],
  ['F41.1', 'Trastorno de ansiedad generalizada'],
  ['G43.9', 'Migraña, no especificada'],
  ['H10.9', 'Conjuntivitis, no especificada'],
  ['H25.9', 'Catarata senil, no especificada'],
  ['I10', 'Hipertensión esencial (primaria)'],
  ['I25.9', 'Enfermedad isquémica crónica del corazón, no especificada'],
  ['I48.9', 'Fibrilación y aleteo auricular, no especificados'],
  ['I50.9', 'Insuficiencia cardíaca, no especificada'],
  ['I64', 'Accidente vascular encefálico agudo, no especificado como hemorrágico o isquémico'],
  ['J00', 'Rinofaringitis aguda (resfriado común)'],
  ['J01.9', 'Sinusitis aguda, no especificada'],
  ['J02.9', 'Faringitis aguda, no especificada'],
  ['J03.9', 'Amigdalitis aguda, no especificada'],
  ['J06.9', 'Infección aguda de vías respiratorias superiores, no especificada'],
  ['J18.9', 'Neumonía, no especificada'],
  ['J20.9', 'Bronquitis aguda, no especificada'],
  ['J30.4', 'Rinitis alérgica, no especificada'],
  ['J44.9', 'Enfermedad pulmonar obstructiva crónica, no especificada'],
  ['J45.9', 'Asma, no especificada'],
  ['K21.9', 'Enfermedad de reflujo gastroesofágico sin esofagitis'],
  ['K29.7', 'Gastritis, no especificada'],
  ['K30', 'Dispepsia funcional'],
  ['K35.8', 'Apendicitis aguda, no especificada'],
  ['K59.0', 'Estreñimiento'],
  ['L20.9', 'Dermatitis atópica, no especificada'],
  ['L30.9', 'Dermatitis, no especificada'],
  ['L50.9', 'Urticaria, no especificada'],
  ['M25.5', 'Dolor articular'],
  ['M54.5', 'Lumbago no especificado'],
  ['M79.1', 'Mialgia'],
  ['N39.0', 'Infección de vías urinarias, sitio no especificado'],
  ['N40', 'Hiperplasia de la próstata'],
  ['O80', 'Parto único espontáneo'],
  ['R05', 'Tos'],
  ['R10.4', 'Dolor abdominal, no especificado'],
  ['R42', 'Mareo y desvanecimiento'],
  ['R50.9', 'Fiebre, no especificada'],
  ['R51', 'Cefalea'],
  ['S06.0', 'Conmoción cerebral'],
  ['S52.5', 'Fractura de la extremidad inferior del radio'],
  ['S93.4', 'Esguince de tobillo'],
  ['T14.9', 'Traumatismo, no especificado'],
  ['U07.1', 'COVID-19, virus identificado'],
  ['Z00.0', 'Examen médico general'],
  ['Z23', 'Necesidad de inmunización contra enfermedad bacteriana única'],
  ['Z34.9', 'Supervisión de embarazo normal, no especificado'],
];

export async function sembrarCie10Demo() {
  const operaciones = CODIGOS_DEMO.map(([codigo, descripcion]) => ({
    updateOne: {
      filter: { codigo },
      update: {
        $set: {
          codigo,
          descripcion,
          codigoNormalizado: normalizarTexto(codigo),
          descripcionNormalizada: normalizarTexto(descripcion),
          activo: true,
        },
      },
      upsert: true,
    },
  }));
  const resultado = await Cie10.bulkWrite(operaciones, { ordered: false });
  return {
    insertados: resultado.upsertedCount,
    actualizados: resultado.modifiedCount,
    total: CODIGOS_DEMO.length,
  };
}
