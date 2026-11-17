const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;;

const uri = "mongodb+srv://24307040_db_user:marritosanchez2004@utfv-cluster.y39fddz.mongodb.net/";
const client = new MongoClient(uri);

let db, aspirantesCol, estudiantesCol;

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

// 1. API para obtener aspirantes
app.get('/api/aspirantes', async (req, res) => {
  try {
    const aspirantes = await aspirantesCol.find({}).toArray();
    res.json(aspirantes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. API para convertir aspirante a estudiante
app.post('/api/convertir/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const aspirante = await aspirantesCol.findOne({ _id: new ObjectId(id) });
    
    if (!aspirante) return res.status(404).json({ error: "Aspirante no encontrado" });

    const totalEstudiantes = await estudiantesCol.countDocuments();
    const matricula = (24307050 + totalEstudiantes).toString();
    const correo = `${matricula}@utfv.edu.mx`;

    const gruposDisponibles = ["LITIID-701", "LITIID-702", "LITIID-703", "LITIID-704"];
    const grupoAsignado = gruposDisponibles[totalEstudiantes % gruposDisponibles.length];

    const materiasBase = [
      { clave: "ITI-701", nombre: "Administración de Bases de Datos", profesor: "Dr. Roberto Gómez", horario: "Lun-Mié 07:00 - 09:00", p1: 0, p2: 0, p3: 0, final: 0 },
      { clave: "ITI-702", nombre: "Seguridad en Redes", profesor: "Ing. Alejandro Torres", horario: "Mar-Jue 09:00 - 11:00", p1: 0, p2: 0, p3: 0, final: 0 },
      { clave: "ITI-703", nombre: "Ingeniería de Software Avanzada", profesor: "Dra. Carmen Soto", horario: "Vie 07:00 - 11:00", p1: 0, p2: 0, p3: 0, final: 0 },
      { clave: "ITI-704", nombre: "Desarrollo Web Profesional", profesor: "Mtro. Carlos Mendoza", horario: "Lun-Mié 11:00 - 13:00", p1: 0, p2: 0, p3: 0, final: 0 },
      { clave: "ITI-705", nombre: "Sistemas Operativos de Red", profesor: "Ing. Mario Pérez", horario: "Mar-Jue 11:00 - 13:00", p1: 0, p2: 0, p3: 0, final: 0 },
      { clave: "ITI-706", nombre: "Inteligencia Artificial Aplicada", profesor: "Dr. Sergio Morales", horario: "Lun-Mié 13:00 - 15:00", p1: 0, p2: 0, p3: 0, final: 0 },
      { clave: "ITI-707", nombre: "Gestión de Proyectos de TI", profesor: "Mtra. Laura Garza", horario: "Mar-Jue 13:00 - 15:00", p1: 0, p2: 0, p3: 0, final: 0 },
      { clave: "ITI-708", nombre: "Tópicos de Base de Datos NoSQL", profesor: "Dr. Roberto Gómez", horario: "Vie 11:00 - 15:00", p1: 0, p2: 0, p3: 0, final: 0 }
    ];

    const nuevoEstudiante = {
      matricula,
      correo,
      nombre: aspirante.nombre || "Sin Nombre",
      apellidos: `${aspirante.apellidoP || ''} ${aspirante.apellidoM || ''}`.trim() || "Sin Apellidos",
      carrera: aspirante.carrera || "Ingeniería en Tecnologías de la Información e Innovación Digital",
      grupo: grupoAsignado,
      materias: materiasBase,
      promedioGeneral: 0.0,
      fechaInscripcion: new Date()
    };

    await estudiantesCol.insertOne(nuevoEstudiante);
    res.json({ success: true, mensaje: "¡Estudiante registrado correctamente!", matricula });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. API Maestra para guardar TODOS los cambios del alumno (Grupo, Carrera, Materias, Profesores y Calificaciones)
app.post('/api/actualizar-todo/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { grupo, carrera, materias } = req.body;

    let promedioGeneral = 0.0;
    if (materias && materias.length > 0) {
      const suma = materias.reduce((acc, m) => acc + parseFloat(m.final || 0), 0);
      promedioGeneral = parseFloat((suma / materias.length).toFixed(2));
    }

    await estudiantesCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { grupo, carrera, materias, promedioGeneral } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4. API para obtener estudiantes normalizados
app.get('/api/estudiantes', async (req, res) => {
  try {
    const estudiantesRaw = await estudiantesCol.find({}).toArray();
    
    const estudiantes = estudiantesRaw.map((est, index) => {
      const apellidoP = est.apellidoP || '';
      const apellidoM = est.apellidoM || '';
      const apellidosFormateados = est.apellidos || `${apellidoP} ${apellidoM}`.trim() || '';
      
      const matricula = est.matricula || (24307051 + index).toString();
      const correo = est.correo || `${matricula}@utfv.edu.mx`;
      const grupo = est.grupo || est.Grupo || "LITIID-704";
      const carrera = est.carrera || est.Carrera || "Ingeniería en Tecnologías de la Información e Innovación Digital";
      
      const materias = est.materias && est.materias.length > 0 ? est.materias : [
        { clave: "ITI-701", nombre: "Administración de Bases de Datos", profesor: "Dr. Roberto Gómez", horario: "Lun-Mié 07:00 - 09:00", p1: 0, p2: 0, p3: 0, final: 0 },
        { clave: "ITI-702", nombre: "Seguridad en Redes", profesor: "Ing. Alejandro Torres", horario: "Mar-Jue 09:00 - 11:00", p1: 0, p2: 0, p3: 0, final: 0 },
        { clave: "ITI-703", nombre: "Ingeniería de Software Avanzada", profesor: "Dra. Carmen Soto", horario: "Vie 07:00 - 11:00", p1: 0, p2: 0, p3: 0, final: 0 },
        { clave: "ITI-704", nombre: "Desarrollo Web Profesional", profesor: "Mtro. Carlos Mendoza", horario: "Lun-Mié 11:00 - 13:00", p1: 0, p2: 0, p3: 0, final: 0 },
        { clave: "ITI-705", nombre: "Sistemas Operativos de Red", profesor: "Ing. Mario Pérez", horario: "Mar-Jue 11:00 - 13:00", p1: 0, p2: 0, p3: 0, final: 0 },
        { clave: "ITI-706", nombre: "Inteligencia Artificial Aplicada", profesor: "Dr. Sergio Morales", horario: "Lun-Mié 13:00 - 15:00", p1: 0, p2: 0, p3: 0, final: 0 },
        { clave: "ITI-707", nombre: "Gestión de Proyectos de TI", profesor: "Mtra. Laura Garza", horario: "Mar-Jue 13:00 - 15:00", p1: 0, p2: 0, p3: 0, final: 0 },
        { clave: "ITI-708", nombre: "Tópicos de Base de Datos NoSQL", profesor: "Dr. Roberto Gómez", horario: "Vie 11:00 - 15:00", p1: 0, p2: 0, p3: 0, final: 0 }
      ];

      let promedioGeneral = est.promedioGeneral;
      if (promedioGeneral === undefined && materias.length > 0) {
        const suma = materias.reduce((acc, m) => acc + (m.final || 0), 0);
        promedioGeneral = (suma / materias.length).toFixed(2);
      } else if (promedioGeneral === undefined) {
        promedioGeneral = "0.00";
      }

      return {
        ...est,
        matricula,
        correo,
        apellidos: apellidosFormateados,
        grupo,
        carrera,
        materias,
        promedioGeneral
      };
    });

    res.json(estudiantes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Sistema UTFV corriendo em http://localhost:${port}`);
});