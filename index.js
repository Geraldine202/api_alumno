require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const cors = require('cors');
app.use(cors());
app.use(express.json());


app.get('/alumnos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('id_tipo_usuario', 1); // <--- Filtro para Alumnos

        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 5. OBTENER UN ALUMNO POR SU RUT
app.get('/alumnos/:rut', async (req, res) => {
    try {
        const { rut } = req.params;

        const { data, error } = await supabase
            .from('usuario')
            .select(`
                *,
                sede(descripcion),
                estado_matricula(descripcion),
                comuna(nombre_comuna),
                carrera!inner(descripcion_carrera) 
            `)
            .eq('rut_usuario', rut)
            .single(); // .single() asegura que devuelva un objeto {} y no un array []

        if (error) throw error;
        
        if (!data) {
            return res.status(404).json({ mensaje: 'Alumno no encontrado' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/alumnos', async (req, res) => {
    try {
        // Extraemos los datos del body
        const { rut_usuario, nombre_completo, genero, correo, direccion, telefono, fecha_nacimiento, id_tipo_usuario, id_periodo_academico, id_estado_matricula, id_comuna, id_sede } = req.body;

        // Validamos que el RUT exista antes de insertar
        if (!rut_usuario) {
            return res.status(400).json({ error: "El RUT es obligatorio" });
        }

        const { data, error } = await supabase
            .from('usuario')
            .insert([{
                rut_usuario,
                nombre_completo,
                genero,
                correo,
                direccion,
                telefono: Number(telefono),
                fecha_nacimiento,
                id_tipo_usuario: id_tipo_usuario || 1,
                id_periodo_academico: id_periodo_academico || 1,
                id_estado_matricula: id_estado_matricula || 1,
                id_comuna: id_comuna || 1,
                id_sede: id_sede || 1,
                cambio_clave_obligatorio: false,
                contrasenia: rut_usuario // Usamos el RUT como clave inicial
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Error en POST /alumnos:", error.message);
        res.status(400).json({ error: error.message });
    }
});

// 3. EDITAR UN ALUMNO (PUT)
app.put('/alumnos/:rut', async (req, res) => {
    try {
        const { rut } = req.params;
        const datos = req.body;

        // Eliminamos el rut_usuario del cuerpo para evitar que Supabase intente 
        // actualizar la Primary Key, lo cual a veces da error.
        delete datos.rut_usuario;

        const { data, error } = await supabase
            .from('usuario')
            .update(datos)
            .eq('rut_usuario', rut)
            .select();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 4. ELIMINAR UN ALUMNO (DELETE)
app.delete('/alumnos/:rut', async (req, res) => {
    try {
        const { rut } = req.params;

        const { error } = await supabase
            .from('usuario')
            .delete()
            .eq('rut_usuario', rut);

        if (error) throw error;
        res.json({ mensaje: 'Alumno eliminado correctamente' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('API lista en http://localhost:3000');
});