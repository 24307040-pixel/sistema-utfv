const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const uri = "mongodb+srv://24307040_db_user:marritosanchez2004@utfv-cluster.y39fddz.mongodb.net/";
const client = new MongoClient(uri);

let db, aspirantesCol, estudiantesCol;

const CATALOGO_ACADEMICO = {
  "Infraestructura en redes digitales": {
    grupos: ["401", "402"],
    materias: [
      { nombre: "Ingles IV", profesor: "Lic. Mariana Fuentes" },
      { nombre: "Ética profesional", profesor: "Mtro. Héctor Salgado" },
      { nombre: "Calculo de varias variables", profesor: "Dr. Eduardo Navarrete" },
      { nombre: "Escalabilidad de redes", profesor: "Ing. Javier Delgado" },
      { nombre: "Programación de redes", profesor: "Ing. Patricia León" },
      { nombre: "Centro de datos", profesor: "Mtro. Ricardo Castellanos" },
      { nombre: "Infraestructura de redes de datos", profesor: "Ing. Javier Delgado" }
    ]
  },
  "Licenciatura en Ingeniería en Tecnologías de la Información e Innovación Digital": {
    grupos: ["702", "704"],
    materias: [
      { nombre: "Ingles VI", profesor: "Lic. Mariana Fuentes" },
      { nombre: "Habilidades gerenciales", profesor: "Mtra. Laura Garza" },
      { nombre: "Formulación de proyectos de tecnología", profesor: "Mtro. Carlos Mendoza" },
      { nombre: "Fundamentos de inteligencia artificial", profesor: "Dr. Sergio Morales" },
      { nombre: "Ética y legislación en tecnologías de la información", profesor: "Mtro. Héctor Salgado" },
      { nombre: "Optativa I", profesor: "Ing. Mario Pérez" },
      { nombre: "Seguridad informática", profesor: "Ing. Alejandro Torres" }
    ]
  },
  "Ingeniería de redes inteligentes y Ciberseguridad": {
    grupos: ["1001", "1002"],
    materias: [
      { nombre: "Ingles VIII", profesor: "Lic. Mariana Fuentes" },
      { nombre: "Tendencias en ciencias de datos", profesor: "Dra. Carmen Soto" },
      { nombre: "Inteligencia de negocios", profesor: "Mtro. Carlos Mendoza" },
      { nombre: "Aplicaciones de inteligencia artificial", profesor: "Dr. Sergio Morales" },
      { nombre: "Modelado de información visual", profesor: "Mtra. Sofía Herrera" },
      { nombre: "Gestión de proyectos", profesor: "Mtra. Laura Garza" },
      { nombre: "Proyecto integrador III", profesor: "Dr. Roberto Gómez" }
    ]
  }
};

function calcularCalificacionFinalMateria(materia) {
  const p1 = parseFloat(materia.p1 ?? 0) || 0;
  const p2 = parseFloat(materia.p2 ?? 0) || 0;
  const p3 = parseFloat(materia.p3 ?? 0) || 0;
  const tieneEgo = materia.ego !== undefined && materia.ego !== null && String(materia.ego).trim() !== "";
  const egoNum = tieneEgo ? (parseFloat(materia.ego) || 0) : null;

  const promedioOrdinario = parseFloat(((p1 + p2 + p3) / 3).toFixed(1));

  // Calificación mínima aprobatoria = 6.0
  // Si tiene EGO registrado, al concluir el EGO se carga la calificación de EGO si es mayor o si reprobó ordinario
  let final = promedioOrdinario;
  if (egoNum !== null && egoNum > 0) {
    final = parseFloat(egoNum.toFixed(1));
  } else if (materia.final !== undefined && materia.final !== null && String(materia.final).trim() !== "" && p1 === 0 && p2 === 0 && p3 === 0) {
    final = parseFloat((parseFloat(materia.final) || 0).toFixed(1));
  }

  const aprobada = final >= 6.0;
  const estatus = aprobada ? "Aprobada" : "Reprobada";

  return {
    clave: materia.clave || "MAT-101",
    nombre: materia.nombre || "Materia",
    profesor: materia.profesor || "Por asignar",
    horario: materia.horario || "Lun-Vie 07:00 - 15:00",
    p1,
    p2,
    p3,
    ego: egoNum,
    final,
    aprobada,
    estatus
  };
}

function generarMateriasPorCarrera(carrera) {
  const config = CATALOGO_ACADEMICO[carrera] || CATALOGO_ACADEMICO["Licenciatura en Ingeniería en Tecnologías de la Información e Innovación Digital"];
  return config.materias.map((item, idx) => calcularCalificacionFinalMateria({
    clave: `MAT-${101 + idx}`,
    nombre: item.nombre,
    profesor: item.profesor,
    horario: "Lun-Vie 07:00 - 15:00",
    p1: 0,
    p2: 0,
    p3: 0,
    ego: null,
    final: 0
  }));
}

function normalizarEstudiante(est, index = 0) {
  const apellidoP = est.apellidoP || '';
  const apellidoM = est.apellidoM || '';
  const apellidosFormateados = est.apellidos || `${apellidoP} ${apellidoM}`.trim() || '';

  const matricula = String(est.matricula || (24307051 + index)).trim();
  const correo = String(est.correo || `${matricula}@utfv.edu.mx`).trim().toLowerCase();
  const carrera = CATALOGO_ACADEMICO[est.carrera]
    ? est.carrera
    : "Licenciatura en Ingeniería en Tecnologías de la Información e Innovación Digital";
  const gruposCarrera = CATALOGO_ACADEMICO[carrera].grupos;
  const grupo = gruposCarrera.includes(String(est.grupo)) ? String(est.grupo) : gruposCarrera[0];

  const rawMaterias = (est.materias && est.materias.length > 0)
    ? est.materias
    : generarMateriasPorCarrera(carrera);

  const materias = rawMaterias.map(m => calcularCalificacionFinalMateria(m));

  const reprobadasCount = materias.filter(m => !m.aprobada).length;
  const aprobadasCount = materias.filter(m => m.aprobada).length;

  let promedioGeneral = est.promedioGeneral;
  if (materias.length > 0) {
    const suma = materias.reduce((acc, m) => acc + parseFloat(m.final || 0), 0);
    promedioGeneral = (suma / materias.length).toFixed(2);
  } else if (promedioGeneral === undefined || promedioGeneral === null || isNaN(parseFloat(promedioGeneral))) {
    promedioGeneral = "0.00";
  } else {
    promedioGeneral = parseFloat(promedioGeneral).toFixed(2);
  }

  return {
    ...est,
    matricula,
    correo,
    apellidos: apellidosFormateados,
    grupo,
    carrera,
    materias,
    reprobadasCount,
    aprobadasCount,
    promedioGeneral
  };
}

async function conectarDB() {
  try {
    await client.connect();
    db = client.db("UTFV_NOSQL");
    aspirantesCol = db.collection("aspirantes");
    estudiantesCol = db.collection("ESTUDIANTES");
    console.log("¡Conectado a MongoDB Atlas exitosamente!");
  } catch (e) {
    console.error("Error al conectar a la base de datos:", e);
  }
}
conectarDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login-admin', (req, res) => {
  const usuario = String(req.body.usuario || "").trim();
  const password = String(req.body.password || "");
  if (usuario === "admin" && password === "utfv2026") {
    return res.json({ success: true, rol: "admin", usuario: "Control Escolar" });
  }
  return res.status(401).json({ success: false, error: "Usuario o contraseña incorrectos" });
});

app.post('/api/login-alumno', async (req, res) => {
  try {
    const matriculaBuscada = String(req.body.matricula || "").trim();
    const correoBuscado = String(req.body.correo || "").trim().toLowerCase();

    if (!matriculaBuscada || !correoBuscado) {
      return res.status(400).json({ success: false, error: "Ingresa tu matrícula y correo institucional" });
    }

    const todos = await estudiantesCol.find({}).toArray();
    const encontradoRaw = todos.find((est, idx) => {
      const matNormalizada = String(est.matricula || (24307051 + idx)).trim();
      const correoNormalizado = String(est.correo || `${matNormalizada}@utfv.edu.mx`).trim().toLowerCase();
      return matNormalizada === matriculaBuscada && correoNormalizado === correoBuscado;
    });

    if (!encontradoRaw) {
      return res.status(404).json({
        success: false,
        error: "No coincide la matrícula con el correo institucional registrado."
      });
    }

    const alumno = normalizarEstudiante(encontradoRaw);
    res.json({ success: true, alumno });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/aspirantes', async (req, res) => {
  try {
    const aspirantes = await aspirantesCol.find({}).toArray();
    res.json(aspirantes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/aspirantes', async (req, res) => {
  try {
    const { nombre, apellidoP, apellidoM, edad, municipio, carrera } = req.body;
    if (!nombre || !apellidoP) {
      return res.status(400).json({ success: false, error: "El nombre y apellido paterno son obligatorios" });
    }

    const carreraElegida = CATALOGO_ACADEMICO[carrera]
      ? carrera
      : "Licenciatura en Ingeniería en Tecnologías de la Información e Innovación Digital";

    const nuevoAspirante = {
      nombre: nombre.trim(),
      apellidoP: apellidoP.trim(),
      apellidoM: (apellidoM || "").trim(),
      edad: Number(edad) || 18,
      municipio: (municipio || "Tultitlán").trim(),
      carrera: carreraElegida,
      fechaRegistro: new Date()
    };

    const resultado = await aspirantesCol.insertOne(nuevoAspirante);
    res.json({ success: true, id: resultado.insertedId, aspirante: nuevoAspirante });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/convertir/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const aspirante = await aspirantesCol.findOne({ _id: new ObjectId(id) });

    if (!aspirante) return res.status(404).json({ error: "Aspirante no encontrado" });

    const totalEstudiantes = await estudiantesCol.countDocuments();
    const matricula = (24307050 + totalEstudiantes).toString();
    const correo = `${matricula}@utfv.edu.mx`;

    const carreraSeleccionada = CATALOGO_ACADEMICO[aspirante.carrera]
      ? aspirante.carrera
      : "Licenciatura en Ingeniería en Tecnologías de la Información e Innovación Digital";

    const gruposCarrera = CATALOGO_ACADEMICO[carreraSeleccionada].grupos;
    const grupoAsignado = gruposCarrera[totalEstudiantes % gruposCarrera.length];
    const materiasAsignadas = generarMateriasPorCarrera(carreraSeleccionada);

    const nuevoEstudiante = {
      matricula,
      correo,
      nombre: aspirante.nombre || "Sin Nombre",
      apellidos: `${aspirante.apellidoP || ''} ${aspirante.apellidoM || ''}`.trim() || "Sin Apellidos",
      edad: aspirante.edad || 18,
      municipio: aspirante.municipio || "N/A",
      carrera: carreraSeleccionada,
      grupo: grupoAsignado,
      materias: materiasAsignadas,
      promedioGeneral: 0.0,
      fechaInscripcion: new Date()
    };

    await estudiantesCol.insertOne(nuevoEstudiante);
    await aspirantesCol.deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true, mensaje: "¡Estudiante inscrito correctamente!", matricula, correo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/actualizar-todo/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { grupo, carrera, materias, recargarMateriasPorCarrera } = req.body;

    const carreraValida = CATALOGO_ACADEMICO[carrera]
      ? carrera
      : "Licenciatura en Ingeniería en Tecnologías de la Información e Innovación Digital";

    const gruposValidos = CATALOGO_ACADEMICO[carreraValida].grupos;
    const grupoValido = gruposValidos.includes(String(grupo)) ? String(grupo) : gruposValidos[0];

    let materiasBase = Array.isArray(materias) ? materias : [];
    if (recargarMateriasPorCarrera || materiasBase.length === 0) {
      materiasBase = generarMateriasPorCarrera(carreraValida);
    }

    const materiasFinales = materiasBase.map(m => calcularCalificacionFinalMateria(m));

    let promedioGeneral = 0.0;
    if (materiasFinales.length > 0) {
      const suma = materiasFinales.reduce((acc, m) => acc + parseFloat(m.final || 0), 0);
      promedioGeneral = parseFloat((suma / materiasFinales.length).toFixed(2));
    }

    await estudiantesCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { grupo: grupoValido, carrera: carreraValida, materias: materiasFinales, promedioGeneral } }
    );
    res.json({ success: true, grupo: grupoValido, carrera: carreraValida, materias: materiasFinales, promedioGeneral });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/estudiantes', async (req, res) => {
  try {
    const estudiantesRaw = await estudiantesCol.find({}).toArray();
    const estudiantes = estudiantesRaw.map((est, index) => normalizarEstudiante(est, index));
    res.json(estudiantes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Sistema UTFV corriendo en http://localhost:${port}`);
});
