require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const multer = require('multer'); 

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// RUTA RAÍZ ATRACTIVA
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>API de Gestión Académica</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    color: #f8fafc;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .card {
                    background: rgba(30, 41, 59, 0.7);
                    padding: 30px;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.1);
                    text-align: center;
                    max-width: 450px;
                }
                .status {
                    display: inline-block;
                    background: #10b981;
                    color: #fff;
                    padding: 5px 12px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: bold;
                    margin-bottom: 15px;
                }
                h1 { margin: 10px 0; color: #38bdf8; font-size: 1.8rem; }
                p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
                .endpoints {
                    margin-top: 20px;
                    text-align: left;
                    background: #0f172a;
                    padding: 15px;
                    border-radius: 8px;
                }
                .endpoint-item {
                    font-family: monospace;
                    font-size: 0.9rem;
                    margin: 8px 0;
                    color: #34d399;
                }
                .endpoint-item span { color: #fbbf24; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="status">● SERVIDOR ONLINE</div>
                <h1>API Sistema de Alumnos</h1>
                <p>Backend centralizado desarrollado en Node.js, Express y Supabase para la aplicación Aqui Todos Ganan</p>
                
                <div class="endpoints">
                    <strong style="color: #94a3b8; font-size: 0.85rem;">RUTAS DISPONIBLES:</strong>
                    <div class="endpoint-item"><span>GET</span> /alumnos</div>
                    <div class="endpoint-item"><span>GET</span> /alumnos/:rut</div>
                    <div class="endpoint-item"><span>POST</span> /alumnos</div>
                    <div class="endpoint-item"><span>PUT</span> /alumnos/:rut</div>
                    <div class="endpoint-item"><span>DELETE</span> /alumnos/:rut</div>
                    <div class="endpoint-item"><span>POST</span> /auth/login</div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// 1. OBTENER TODOS LOS ALUMNOS
app.get('/alumnos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('id_tipo_usuario', 1); 

        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. OBTENER UN ALUMNO POR SU RUT
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
            .maybeSingle();

        if (error) throw error;
        
        if (!data) {
            return res.status(404).json({ mensaje: 'Alumno no encontrado' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================================================
// 3. CREAR ALUMNO CON IMAGEN OPCIONAL (POST)
// ==========================================================================
app.post('/alumnos', upload.single('foto'), async (req, res) => {
    try {
        const archivo = req.file;
        let urlImagenFinal = null;
        let datosAlumno;

        if (archivo) {
            datosAlumno = typeof req.body.datos === 'string' ? JSON.parse(req.body.datos) : req.body.datos;
        } else {
            datosAlumno = req.body;
        }

        const { 
            rut_usuario, nombre_completo, genero, correo, direccion, 
            telefono, fecha_nacimiento, id_tipo_usuario, 
            id_periodo_academico, id_estado_matricula, id_comuna, id_sede 
        } = datosAlumno;

        if (!rut_usuario) {
            return res.status(400).json({ error: "El RUT es obligatorio" });
        }

        if (archivo) {
            const extension = archivo.originalname.split('.').pop();
            const nombreArchivo = `${rut_usuario}_${Date.now()}.${extension}`;
            
            const { error: storageError } = await supabase.storage
                .from('fotos_alumnos')
                .upload(nombreArchivo, archivo.buffer, {
                    contentType: archivo.mimetype,
                    upsert: true
                });

            if (storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage
                .from('fotos_alumnos')
                .getPublicUrl(nombreArchivo);

            urlImagenFinal = publicUrlData.publicUrl;
        }

        const { data, error } = await supabase
            .from('usuario')
            .insert([{
                rut_usuario,
                nombre_completo,
                genero,
                correo,
                direccion,
                telefono: telefono ? Number(telefono) : null,
                fecha_nacimiento,
                imagen: urlImagenFinal, 
                id_tipo_usuario: id_tipo_usuario || 1,
                id_periodo_academico: id_periodo_academico || 1,
                id_estado_matricula: id_estado_matricula || 1,
                id_comuna: id_comuna || 1,
                id_sede: id_sede || 1,
                cambio_clave_obligatorio: false,
                contrasenia: rut_usuario
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Error en POST /alumnos:", error.message);
        res.status(400).json({ error: error.message });
    }
});

// ==========================================================================
// 4. EDITAR UN ALUMNO (PUT) - CORREGIDO TOTALMENTE PARA FORM-DATA UNIFICADO
// ==========================================================================
app.put('/alumnos/:rut', upload.single('foto'), async (req, res) => {
    try {
        const { rut } = req.params;
        const archivo = req.file;
        let datos = {};

        // CORRECCIÓN CRUCIAL: Extrae 'datos' sin importar si viene con archivo o sin archivo
        if (req.body.datos) {
            datos = typeof req.body.datos === 'string' ? JSON.parse(req.body.datos) : req.body.datos;
        } else {
            datos = { ...req.body };
        }

        // Limpieza de parámetros de seguridad
        delete datos.rut_usuario; 

        if (archivo) {
            // 1. Buscamos la foto antigua asignada para no acumular basura en el Storage
            const { data: usuarioActual } = await supabase
                .from('usuario')
                .select('imagen')
                .eq('rut_usuario', rut)
                .maybeSingle();

            if (usuarioActual && usuarioActual.imagen) {
                const urlPartes = usuarioActual.imagen.split('/');
                const nombreArchivoViejo = urlPartes[urlPartes.length - 1].split('?')[0];
                
                // Borramos archivo antiguo de forma asíncrona tolerando fallos si ya no existía
                await supabase.storage.from('fotos_alumnos').remove([nombreArchivoViejo]);
            }

            // 2. Subimos la nueva foto física al bucket
            const extension = archivo.originalname.split('.').pop();
            const nuevoNombreArchivo = `${rut}_${Date.now()}.${extension}`;

            const { error: storageError } = await supabase.storage
                .from('fotos_alumnos')
                .upload(nuevoNombreArchivo, archivo.buffer, {
                    contentType: archivo.mimetype,
                    upsert: true
                });

            if (storageError) throw storageError;

            // 3. Generamos e inyectamos la nueva URL pública al objeto que se guardará en la base de datos
            const { data: publicUrlData } = supabase.storage
                .from('fotos_alumnos')
                .getPublicUrl(nuevoNombreArchivo);

            datos.imagen = publicUrlData.publicUrl;
        }

        // 4. Actualizamos el registro en la tabla de Supabase
        const { data, error } = await supabase
            .from('usuario')
            .update(datos)
            .eq('rut_usuario', rut)
            .select();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Error en PUT /alumnos:", error.message);
        res.status(400).json({ error: error.message });
    }
});

// ==========================================================================
// 5. ELIMINAR UN ALUMNO (DELETE)
// ==========================================================================
app.delete('/alumnos/:rut', async (req, res) => {
    try {
        const { rut } = req.params;

        const { data: usuario, error: findError } = await supabase
            .from('usuario')
            .select('imagen')
            .eq('rut_usuario', rut)
            .maybeSingle();

        if (findError) throw findError; 

        if (usuario && usuario.imagen) {
            const urlPartes = usuario.imagen.split('/');
            const nombreArchivo = urlPartes[urlPartes.length - 1].split('?')[0];
            
            const { error: deleteStorageError } = await supabase.storage
                .from('fotos_alumnos')
                .remove([nombreArchivo]);

            if (deleteStorageError) {
                console.error("Advertencia: No se pudo borrar la foto del Storage:", deleteStorageError.message);
            }
        }

        const { error: deleteDbError } = await supabase
            .from('usuario')
            .delete()
            .eq('rut_usuario', rut);

        if (deleteDbError) throw deleteDbError;

        res.json({ mensaje: 'Alumno y su foto correspondiente eliminados con éxito' });
    } catch (error) {
        console.error("Error en DELETE /alumnos:", error.message);
        res.status(400).json({ error: error.message });
    }
});

// ==========================================================================
// 6. AUTENTICACIÓN / LOGIN DE USUARIOS
// ==========================================================================
app.post('/auth/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        // 1. Validar que vengan las credenciales
        if (!correo || !password) {
            return res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
        }

        // 2. Buscar al usuario en la base de datos por su correo
        const { data: usuario, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('correo', correo)
            .maybeSingle(); // Trae un objeto único o null si no existe

        if (error) throw error;

        // 3. Si no existe el usuario o la contraseña no coincide
        // NOTA: Como en tu POST de alumnos guardas la contraseña como texto plano (contrasenia: rut_usuario),
        // la validación se hace directamente. Si usas hashing en el futuro, aquí va bcrypt.compare()
        if (!usuario || usuario.contrasenia !== password) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }

        // 4. Verificar si el usuario está suspendido (Opcional, según tu regla de negocio)
        if (usuario.id_estado_matricula === 2) {
            return res.status(403).json({ error: 'El usuario se encuentra suspendido.' });
        }

        // 5. Limpiar datos sensibles antes de responder al Frontend
        delete usuario.contrasenia;

        // 6. Respuesta exitosa con los datos que recibirá tu Ionic
        res.json({
            mensaje: 'Autenticación exitosa',
            usuario: usuario
        });

    } catch (error) {
        console.error("Error en POST /auth/login:", error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API lista en el puerto ${PORT}`);
});