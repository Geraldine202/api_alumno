    require('dotenv').config();
    const express = require('express');
    const { createClient } = require('@supabase/supabase-js');
    const cors = require('cors');
    const multer = require('multer');
    const nodemailer = require('nodemailer');

    const app = express();
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const upload = multer({ storage: multer.memoryStorage() });

    app.use(cors());
    app.use(express.json());

    // ==========================================
    // FUNCIÓN AUXILIAR DE FORMATEO DE RUT
    // ==========================================
    function formatearRutChile(rut) {
        if (!rut) return '';
        const limpio = rut.toString().replace(/[^0-9kK]/g, '');
        if (limpio.length <= 1) return limpio;

        const cuerpo = limpio.slice(0, -1);
        const dv = limpio.slice(-1).toUpperCase();
        const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

        return `${cuerpoFormateado}-${dv}`;
    }

    // Configuración de envío con Gmail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // RUTA RAÍZ DOCUMENTADA
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
                        min-height: 100vh;
                        margin: 0;
                        padding: 20px;
                        box-sizing: border-box;
                    }
                    .card {
                        background: rgba(30, 41, 59, 0.7);
                        padding: 30px;
                        border-radius: 16px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255,255,255,0.1);
                        text-align: center;
                        width: 100%;
                        max-width: 520px;
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
                        max-height: 300px;
                        overflow-y: auto;
                    }
                    .endpoint-item {
                        font-family: monospace;
                        font-size: 0.85rem;
                        margin: 8px 0;
                        color: #34d399;
                    }
                    .endpoint-item span { color: #fbbf24; font-weight: bold; }
                    .endpoint-item span.del { color: #f87171; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="status">● SERVIDOR ONLINE</div>
                    <h1>API Sistema de Alumnos</h1>
                    <p>Backend centralizado en Node.js, Express y Supabase para gestión de alumnos.</p>
                    
                    <div class="endpoints">
                        <strong style="color: #94a3b8; font-size: 0.85rem;">RUTAS DISPONIBLES:</strong>
                        <div class="endpoint-item"><span>GET</span> /alumnos</div>
                        <div class="endpoint-item"><span>GET</span> /alumnos/:rut</div>
                        <div class="endpoint-item"><span>POST</span> /alumnos</div>
                        <div class="endpoint-item"><span>PUT</span> /alumnos/:rut</div>
                        <div class="endpoint-item"><span class="del">DELETE</span> /alumnos/:rut</div>
                        <div class="endpoint-item"><span>GET</span> /alumnos/historial_academico/:rut</div>
                        <div class="endpoint-item"><span>POST</span> /alumnos/historial_academico</div>
                        <div class="endpoint-item"><span class="del">DELETE</span> /alumnos/historial_academico/:id</div>
                        <div class="endpoint-item"><span>GET</span> /carreras</div>
                        <div class="endpoint-item"><span>GET</span> /carreras/escuela/:id_escuela</div>
                        <div class="endpoint-item"><span>POST</span> /auth/login</div>
                        <div class="endpoint-item"><span>POST</span> /auth/logout</div>
                        <div class="endpoint-item"><span>POST</span> /auth/solicitar-recuperacion</div>
                        <div class="endpoint-item"><span>POST</span> /auth/restablecer-password</div>
                    </div>
                </div>
            </body>
            </html>
        `);
    });

    // ==========================================
    // RUTAS DE CARRERAS CON JOIN A JORNADA Y TIPO
    // ==========================================

    app.get('/carreras', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('carrera')
                .select(`
                    *,
                    jornada_carrera(*),
                    tipo_carrera(*)
                `);

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/carreras/escuela/:id_escuela', async (req, res) => {
        try {
            const { id_escuela } = req.params;
            const { data, error } = await supabase
                .from('carrera')
                .select(`
                    *,
                    jornada_carrera(*),
                    tipo_carrera(*)
                `)
                .eq('id_escuela', Number(id_escuela));

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================
    // RUTAS DE ESCUELAS, SEDES, JORNADAS, ETC.
    // ==========================================

    app.get('/escuelas', async (req, res) => {
        try {
            const { data, error } = await supabase.from('escuela').select('*');
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/sedes', async (req, res) => {
        try {
            const { data, error } = await supabase.from('sede').select('*');
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/jornadas', async (req, res) => {
        try {
            const { data, error } = await supabase.from('jornada_carrera').select('*');
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/tipos-carrera', async (req, res) => {
        try {
            const { data, error } = await supabase.from('tipo_carrera').select('*');
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/periodos-academicos', async (req, res) => {
        try {
            const { data, error } = await supabase.from('periodo_academico').select('*');
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/estados-matricula', async (req, res) => {
        try {
            const { data, error } = await supabase.from('estado_matricula').select('*');
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================
    // RUTAS DE ALUMNOS
    // ==========================================

    // 1. OBTENER TODOS LOS ALUMNOS
    app.get('/alumnos', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select(`
                    *,
                    carrera(
                        *,
                        jornada_carrera(*),
                        tipo_carrera(*)
                    ),
                    sede(descripcion),
                    estado_matricula(descripcion),
                    comuna(nombre_comuna),
                    puntaje_total(puntaje),
                    participacion_activa(total_actividades, estado),
                    validacion_usuario(*),
                    historial_academico(*)
                `)
                .eq('id_tipo_usuario', 1); 

            if (error) throw error;

            const respuestaFormateada = data.map(alu => {
                const pt = Array.isArray(alu.puntaje_total) ? alu.puntaje_total[0] : alu.puntaje_total;
                const pa = Array.isArray(alu.participacion_activa) ? alu.participacion_activa[0] : alu.participacion_activa;
                const ha = Array.isArray(alu.historial_academico) ? alu.historial_academico[0] : alu.historial_academico;
                const actividadesCount = pa ? (pa.total_actividades || 0) : 0;

                return {
                    ...alu,
                    jornada: alu.carrera?.jornada_carrera?.descripcion || '',
                    tipo_carrera: alu.carrera?.tipo_carrera?.descripcion || '',
                    puntaje_total: pt ? pt.puntaje : 0,
                    actividades_inscritas: actividadesCount,
                    participacion_activa: actividadesCount > 1,
                    historial_academico_resumen: ha ? ha.descripcion : ''
                };
            });

            res.json(respuestaFormateada);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 2. OBTENER ALUMNO POR RUT
    app.get('/alumnos/:rut', async (req, res) => {
        try {
            const rutFormateado = formatearRutChile(decodeURIComponent(req.params.rut));

            const { data, error } = await supabase
                .from('usuario')
                .select(`
                    *,
                    carrera(
                        *,
                        jornada_carrera(*),
                        tipo_carrera(*)
                    ),
                    sede(descripcion),
                    estado_matricula(descripcion),
                    comuna(nombre_comuna),
                    puntaje_total(puntaje),
                    participacion_activa(total_actividades, estado),
                    validacion_usuario(*),
                    historial_academico(*)
                `)
                .eq('rut_usuario', rutFormateado)
                .maybeSingle();

            if (error) throw error;
            
            if (!data) {
                return res.status(404).json({ mensaje: 'Alumno no encontrado' });
            }

            const pt = Array.isArray(data.puntaje_total) ? data.puntaje_total[0] : data.puntaje_total;
            const pa = Array.isArray(data.participacion_activa) ? data.participacion_activa[0] : data.participacion_activa;
            const ha = Array.isArray(data.historial_academico) ? data.historial_academico[0] : data.historial_academico;
            const actividadesCount = pa ? (pa.total_actividades || 0) : 0;

            res.json({
                ...data,
                jornada: data.carrera?.jornada_carrera?.descripcion || '',
                tipo_carrera: data.carrera?.tipo_carrera?.descripcion || '',
                puntaje_total: pt ? pt.puntaje : 0,
                actividades_inscritas: actividadesCount,
                participacion_activa: actividadesCount > 1,
                historial_academico_resumen: ha ? ha.descripcion : ''
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 3. CREAR ALUMNO
app.post('/alumnos', upload.single('foto'), async (req, res) => {
    let nombreArchivoGuardado = null;
    let rutCreado = null;

    try {
        const archivo = req.file;
        let urlImagenFinal = null;
        let datosAlumno;

        if (req.body.datos) {
            datosAlumno = typeof req.body.datos === 'string' ? JSON.parse(req.body.datos) : req.body.datos;
        } else {
            datosAlumno = req.body || {};
        }

        const { 
            rut_usuario, nombre_completo, genero, correo, direccion, 
            telefono, fecha_nacimiento, id_tipo_usuario, 
            id_periodo_academico, id_estado_matricula, id_comuna, id_sede,
            id_escuela, id_carrera, id_requisito,
            puntaje_total, actividades_inscritas, historial_academico_resumen
        } = datosAlumno;

        if (!rut_usuario || !nombre_completo || !correo) {
            return res.status(400).json({ error: "El RUT, nombre completo y correo son obligatorios." });
        }

        // Formatear RUT antes de guardar
        rutCreado = formatearRutChile(rut_usuario);

        if (archivo) {
            const extension = archivo.originalname.split('.').pop();
            nombreArchivoGuardado = `${rutCreado}_${Date.now()}.${extension}`;
            
            const { error: storageError } = await supabase.storage
                .from('fotos_alumnos')
                .upload(nombreArchivoGuardado, archivo.buffer, {
                    contentType: archivo.mimetype,
                    upsert: true
                });

            if (storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage
                .from('fotos_alumnos')
                .getPublicUrl(nombreArchivoGuardado);

            urlImagenFinal = publicUrlData.publicUrl;
        }

        // Inserción en la tabla usuario (solo usando la clave foránea id_periodo_academico)
        const { data: usuarioCreado, error: userError } = await supabase
            .from('usuario')
            .insert([{
                rut_usuario: rutCreado,
                nombre_completo,
                genero,
                correo,
                direccion,
                telefono: telefono ? Number(telefono) : null,
                fecha_nacimiento,
                imagen: urlImagenFinal, 
                id_carrera: id_carrera ? Number(id_carrera) : null,
                id_tipo_usuario: id_tipo_usuario || 1,
                id_periodo_academico: id_periodo_academico || 1, // <- Se mantiene únicamente el ID
                id_estado_matricula: id_estado_matricula || 1,
                id_comuna: id_comuna || 1,
                id_sede: id_sede || 1,
                cambio_clave_obligatorio: false,
                contrasenia: rutCreado
            }])
            .select()
            .single();

        if (userError) throw userError;

        const fechaVigenciaDefault = new Date();
        fechaVigenciaDefault.setFullYear(fechaVigenciaDefault.getFullYear() + 1);

        const totalActividades = Number(actividades_inscritas || 0);

        try {
            const insercionesAsociadas = [
                supabase.from('puntaje_total').insert([{
                    rut_usuario: rutCreado,
                    puntaje: Number(puntaje_total || 0),
                    vigencia: fechaVigenciaDefault.toISOString()
                }]),
                supabase.from('historial_puntos').insert([{
                    rut_usuario: rutCreado,
                    puntos_actuales: Number(puntaje_total || 0),
                    puntos_canjeados: 0,
                    puntos_totales_obtenidos: Number(puntaje_total || 0)
                }]),
                supabase.from('participacion_activa').insert([{
                    rut_usuario: rutCreado,
                    total_actividades: totalActividades,
                    estado: totalActividades > 1 ? 'Activo' : 'Inactivo',
                    id_periodo_academico: id_periodo_academico || 1
                }]),
                supabase.from('validacion_usuario').insert([{
                    rut_usuario: rutCreado,
                    matriculado: datosAlumno.matriculado !== undefined ? Boolean(datosAlumno.matriculado) : true,
                    suspension: datosAlumno.suspension !== undefined ? Boolean(datosAlumno.suspension) : false,
                    sumario: datosAlumno.sumario !== undefined ? Boolean(datosAlumno.sumario) : false,
                    cumple: true,
                    observacion: datosAlumno.observacion || 'Alumno habilitado',
                    id_requisito: id_requisito || null
                }])
            ];

            if (id_escuela || historial_academico_resumen) {
                insercionesAsociadas.push(
                    supabase.from('historial_academico').insert([{
                        rut_usuario: rutCreado,
                        tipo_evento: 'INGRESO',
                        id_escuela: id_escuela || null,
                        descripcion: historial_academico_resumen || 'Registro inicial'
                    }])
                );
            }

            await Promise.all(insercionesAsociadas);

        } catch (errorRelaciones) {
            if (rutCreado) {
                await supabase.from('usuario').delete().eq('rut_usuario', rutCreado);
            }
            if (nombreArchivoGuardado) {
                await supabase.storage.from('fotos_alumnos').remove([nombreArchivoGuardado]);
            }
            throw new Error(`Fallo en la creación de registros vinculados: ${errorRelaciones.message}`);
        }

        res.status(201).json({
            mensaje: 'Alumno registrado correctamente con todos sus atributos.',
            usuario: usuarioCreado
        });

    } catch (error) {
        console.error("Error en POST /alumnos:", error.message);
        res.status(400).json({ error: error.message });
    }
});

    // 4. EDITAR ALUMNO
    app.put('/alumnos/:rut', upload.single('foto'), async (req, res) => {
        try {
            const rutFormateado = formatearRutChile(decodeURIComponent(req.params.rut));
            const archivo = req.file;
            let datos = {};

            if (req.body.datos) {
                datos = typeof req.body.datos === 'string' ? JSON.parse(req.body.datos) : req.body.datos;
            } else {
                datos = { ...req.body };
            }

            const {
                matriculado, suspension, sumario, cumple, observacion, id_requisito,
                id_escuela, puntaje_total, actividades_inscritas, participacion_activa,
                historial_academico_resumen, jornada, tipo_carrera, carrera, sede, comuna,
                estado_matricula, validacion_usuario, historial_academico,
                ...datosUsuario
            } = datos;

            delete datosUsuario.rut_usuario; 

            if (datosUsuario.id_carrera !== undefined) {
                datosUsuario.id_carrera = datosUsuario.id_carrera ? Number(datosUsuario.id_carrera) : null;
            }

            if (archivo) {
                const { data: usuarioActual } = await supabase
                    .from('usuario')
                    .select('imagen')
                    .eq('rut_usuario', rutFormateado)
                    .maybeSingle();

                if (usuarioActual && usuarioActual.imagen) {
                    const urlPartes = usuarioActual.imagen.split('/');
                    const nombreArchivoViejo = urlPartes[urlPartes.length - 1].split('?')[0];
                    await supabase.storage.from('fotos_alumnos').remove([nombreArchivoViejo]);
                }

                const extension = archivo.originalname.split('.').pop();
                const nuevoNombreArchivo = `${rutFormateado}_${Date.now()}.${extension}`;

                const { error: storageError } = await supabase.storage
                    .from('fotos_alumnos')
                    .upload(nuevoNombreArchivo, archivo.buffer, {
                        contentType: archivo.mimetype,
                        upsert: true
                    });

                if (storageError) throw storageError;

                const { data: publicUrlData } = supabase.storage
                    .from('fotos_alumnos')
                    .getPublicUrl(nuevoNombreArchivo);

                datosUsuario.imagen = publicUrlData.publicUrl;
            }

            const { data: usuarioActualizado, error: userError } = await supabase
                .from('usuario')
                .update(datosUsuario)
                .eq('rut_usuario', rutFormateado)
                .select()
                .single();

            if (userError) throw userError;

            const actualizacionesSecundarias = [];

            const datosValidacion = {};
            if (matriculado !== undefined) datosValidacion.matriculado = Boolean(matriculado);
            if (suspension !== undefined) datosValidacion.suspension = Boolean(suspension);
            if (sumario !== undefined) datosValidacion.sumario = Boolean(sumario);
            if (cumple !== undefined) datosValidacion.cumple = Boolean(cumple);
            if (observacion !== undefined) datosValidacion.observacion = observacion;
            if (id_requisito !== undefined) datosValidacion.id_requisito = id_requisito;

            if (Object.keys(datosValidacion).length > 0) {
                actualizacionesSecundarias.push(
                    supabase.from('validacion_usuario').update(datosValidacion).eq('rut_usuario', rutFormateado)
                );
            }

            if (puntaje_total !== undefined) {
                actualizacionesSecundarias.push(
                    supabase.from('puntaje_total').update({ puntaje: Number(puntaje_total) }).eq('rut_usuario', rutFormateado)
                );
            }

            if (actividades_inscritas !== undefined) {
                const count = Number(actividades_inscritas);
                actualizacionesSecundarias.push(
                    supabase.from('participacion_activa').update({
                        total_actividades: count,
                        estado: count > 1 ? 'Activo' : 'Inactivo'
                    }).eq('rut_usuario', rutFormateado)
                );
            }

            if (historial_academico_resumen) {
                actualizacionesSecundarias.push(
                    supabase.from('historial_academico').insert([{
                        rut_usuario: rutFormateado,
                        tipo_evento: 'ACTUALIZACION',
                        descripcion: historial_academico_resumen,
                        id_escuela: id_escuela || null
                    }])
                );
            }

            if (actualizacionesSecundarias.length > 0) {
                await Promise.all(actualizacionesSecundarias);
            }

            res.json({
                mensaje: 'Información del alumno y registros asociados actualizados con éxito.',
                usuario: usuarioActualizado
            });

        } catch (error) {
            console.error("Error en PUT /alumnos:", error.message);
            res.status(400).json({ error: error.message });
        }
    });

    // 5. ELIMINAR ALUMNO (ACTUALIZADO CON CASCADA Y FORMATO DE RUT)
    app.delete('/alumnos/:rut', async (req, res) => {
        try {
            const rutRecibido = decodeURIComponent(req.params.rut).trim();
            const rutFormateado = formatearRutChile(rutRecibido);

            // 1. Obtener la referencia del usuario
            const { data: usuario, error: findError } = await supabase
                .from('usuario')
                .select('imagen, rut_usuario')
                .eq('rut_usuario', rutFormateado)
                .maybeSingle();

            if (findError) throw findError;
            if (!usuario) {
                return res.status(404).json({ error: `El alumno con RUT ${rutFormateado} no existe.` });
            }

            // 2. Eliminar la foto en el bucket si existe
            if (usuario.imagen) {
                try {
                    const urlPartes = usuario.imagen.split('/');
                    const nombreArchivo = urlPartes[urlPartes.length - 1].split('?')[0];
                    await supabase.storage.from('fotos_alumnos').remove([nombreArchivo]);
                } catch (storageErr) {
                    console.warn("No se pudo borrar la imagen:", storageErr.message);
                }
            }

            // 3. Eliminar únicamente el registro de usuario. PostgreSQL elimina automáticamente todo el historial.
            const { error: deleteDbError } = await supabase
                .from('usuario')
                .delete()
                .eq('rut_usuario', usuario.rut_usuario);

            if (deleteDbError) throw deleteDbError;

            return res.json({ mensaje: 'Alumno y todos sus registros vinculados se eliminaron con éxito.' });

        } catch (error) {
            console.error("Error en DELETE /alumnos:", error.message || error);
            return res.status(500).json({ error: error.message || 'Error interno al eliminar alumno' });
        }
    });

    // ==========================================
    // RUTAS DE HISTORIAL ACADÉMICO
    // ==========================================

    app.get('/alumnos/historial_academico/:rut', async (req, res) => {
        try {
            const rutFormateado = formatearRutChile(decodeURIComponent(req.params.rut));

            const { data, error } = await supabase
                .from('historial_academico')
                .select('*')
                .eq('rut_usuario', rutFormateado)
                .order('fecha_registro', { ascending: false });

            if (error) throw error;

            return res.status(200).json(data || []);

        } catch (err) {
            console.error('Error interno en servidor:', err);
            return res.status(500).json({ error: 'Error interno del servidor al consultar el historial' });
        }
    });

    app.post('/alumnos/historial_academico', async (req, res) => {
        try {
            const { rut_usuario, tipo_evento, descripcion, id_escuela } = req.body;

            if (!rut_usuario || !descripcion) {
                return res.status(400).json({ error: 'El RUT del usuario y la descripción son obligatorios.' });
            }

            const rutFormateado = formatearRutChile(rut_usuario);

            const { data, error } = await supabase
                .from('historial_academico')
                .insert([
                    {
                        rut_usuario: rutFormateado,
                        tipo_evento: tipo_evento ? tipo_evento.trim() : 'GENERAL',
                        descripcion: descripcion.trim(),
                        id_escuela: id_escuela ? Number(id_escuela) : null
                    }
                ])
                .select();

            if (error) throw error;

            return res.status(201).json({
                mensaje: 'Historial académico guardado exitosamente.',
                historial: data[0]
            });
        } catch (error) {
            console.error('Error al procesar historial_academico:', error.message);
            return res.status(500).json({ error: error.message });
        }
    });

    app.delete('/alumnos/historial_academico/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({ error: 'El ID del hito académico es obligatorio.' });
            }

            const { error } = await supabase
                .from('historial_academico')
                .delete()
                .eq('id_historial', Number(id)); 

            if (error) throw error;

            return res.json({ mensaje: 'Hito académico eliminado con éxito.' });
        } catch (error) {
            console.error('Error al eliminar hito académico:', error.message);
            return res.status(500).json({ error: error.message });
        }
    });

    // ==========================================
    // AUTENTICACIÓN
    // ==========================================

    app.post('/auth/login', async (req, res) => {
        try {
            const { correo, password } = req.body;

            if (!correo || !password) {
                return res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
            }

            const { data: usuario, error } = await supabase
                .from('usuario')
                .select('*')
                .eq('correo', correo.trim())
                .maybeSingle();

            if (error) throw error;

            if (!usuario || usuario.contrasenia !== password) {
                return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
            }

            if (usuario.id_estado_matricula === 2) {
                return res.status(403).json({ error: 'El usuario se encuentra suspendido.' });
            }

            const tokenAcceso = `tk_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

            await supabase
                .from('sesion_usuario')
                .upsert(
                    { 
                        rut_usuario: usuario.rut_usuario, 
                        token_acceso: tokenAcceso 
                    }, 
                    { onConflict: 'rut_usuario' }
                );

            delete usuario.contrasenia;

            res.json({
                mensaje: 'Autenticación exitosa',
                usuario: usuario,
                token_acceso: tokenAcceso
            });

        } catch (error) {
            console.error("Error en POST /auth/login:", error.message);
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    });

    app.post('/auth/logout', async (req, res) => {
        try {
            const { rut_usuario } = req.body;

            if (!rut_usuario) {
                return res.status(400).json({ error: 'El RUT del usuario es obligatorio.' });
            }

            const rutFormateado = formatearRutChile(rut_usuario);

            const { error } = await supabase
                .from('sesion_usuario')
                .delete()
                .eq('rut_usuario', rutFormateado);

            if (error) throw error;

            res.json({ mensaje: 'Sesión cerrada exitosamente.' });
        } catch (error) {
            console.error("Error en POST /auth/logout:", error.message);
            res.status(500).json({ error: 'Error al cerrar sesión.' });
        }
    });

    app.post('/auth/solicitar-recuperacion', async (req, res) => {
        try {
            const { correo } = req.body;

            if (!correo) return res.status(400).json({ error: 'El correo es obligatorio.' });

            const { data: usuario, error: userError } = await supabase
                .from('usuario')
                .select('rut_usuario')
                .eq('correo', correo.trim())
                .maybeSingle();

            if (userError || !usuario) {
                return res.status(404).json({ error: 'No existe un usuario con ese correo.' });
            }

            const codigoNumerico = Math.floor(100000 + Math.random() * 900000).toString();
            const fechaExpiracion = new Date(Date.now() + 60 * 60 * 1000).toISOString();

            const { error: tokenError } = await supabase
                .from('recuperar_contrasenia')
                .insert([{
                    token: codigoNumerico,
                    fecha_expiracion: fechaExpiracion,
                    usado: false,
                    rut_usuario: usuario.rut_usuario
                }]);

            if (tokenError) throw tokenError;

            const mailOptions = {
                from: `"Sistema de Asistencia" <${process.env.EMAIL_USER}>`,
                to: correo,
                subject: 'Tu código de verificación de contraseña',
                text: `Tu código de verificación es: ${codigoNumerico}. Válido por 1 hora.`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #0056b3; text-align: center;">Código de Recuperación</h2>
                    <p>Hola,</p>
                    <p>Usa el siguiente código de 6 dígitos para restablecer tu contraseña:</p>
                    <div style="background-color: #f4f6f8; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                        <strong style="font-size: 32px; color: #111; letter-spacing: 5px;">${codigoNumerico}</strong>
                    </div>
                    <p style="font-size: 12px; color: #777;">Este código expira en 1 hora.</p>
                </div>
                `
            };

            await transporter.sendMail(mailOptions);
            return res.json({ mensaje: 'Código enviado correctamente a tu correo.' });

        } catch (error) {
            console.error('Error en recuperar contraseña:', error.message);
            return res.status(500).json({ error: 'Error al enviar el código de recuperación.' });
        }
    });

    app.post('/auth/restablecer-password', async (req, res) => {
        try {
            const { token, nueva_contrasenia } = req.body;

            if (!token || !nueva_contrasenia) {
                return res.status(400).json({ error: 'El código y la nueva contraseña son obligatorios.' });
            }

            const { data: registroToken, error: tokenError } = await supabase
                .from('recuperar_contrasenia')
                .select('*')
                .eq('token', token)
                .eq('usado', false)
                .maybeSingle();

            if (tokenError || !registroToken) {
                return res.status(400).json({ error: 'Código inválido o ya utilizado.' });
            }

            if (new Date(registroToken.fecha_expiracion) < new Date()) {
                return res.status(400).json({ error: 'El código ha expirado.' });
            }

            await supabase
                .from('usuario')
                .update({ contrasenia: nueva_contrasenia })
                .eq('rut_usuario', registroToken.rut_usuario);

            await supabase
                .from('recuperar_contrasenia')
                .update({ usado: true })
                .eq('id_recuperacion', registroToken.id_recuperacion);

            res.json({ mensaje: 'Contraseña actualizada con éxito.' });
        } catch (error) {
            console.error('Error al restablecer contraseña:', error.message);
            res.status(500).json({ error: 'Error al restablecer la contraseña.' });
        }
    });

    // ==========================================
    // INICIO DEL SERVIDOR
    // ==========================================
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });