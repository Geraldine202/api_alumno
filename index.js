    require('dotenv').config();
    const express = require('express');
    const { createClient } = require('@supabase/supabase-js');
    const cors = require('cors');
    const multer = require('multer');
    const nodemailer = require('nodemailer');

    const app = express();
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const upload = multer({ storage: multer.memoryStorage() });
    const crypto = require('crypto');
    const bcrypt = require('bcrypt');
    app.use(cors());
    app.use(express.json());

    const hash = bcrypt.hashSync('admin123', 10);
    console.log(hash);
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
            .in('id_tipo_usuario', [1, 4]); // <--- Cambio realizado aquí

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

// OBTENER TODOS LOS DOCENTES (id_tipo_usuario = 3)
app.get('/docentes', async (req, res) => {
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
            .eq('id_tipo_usuario', 3); // <--- Exclusivo para Docentes

        if (error) throw error;

        const respuestaFormateada = data.map(doc => {
            const pt = Array.isArray(doc.puntaje_total) ? doc.puntaje_total[0] : doc.puntaje_total;
            const pa = Array.isArray(doc.participacion_activa) ? doc.participacion_activa[0] : doc.participacion_activa;
            const ha = Array.isArray(doc.historial_academico) ? doc.historial_academico[0] : doc.historial_academico;
            const actividadesCount = pa ? (pa.total_actividades || 0) : 0;

            return {
                ...doc,
                // Asegura compatibilidad de nombres para la plantilla HTML
                nombre_completo: doc.nombre_completo || `${doc.nombre || ''} ${doc.apellido || doc.paterno || ''}`.trim() || 'Sin Nombre',
                correo: doc.correo || doc.correo_institucional || doc.email || '',
                jornada: doc.carrera?.jornada_carrera?.descripcion || '',
                tipo_carrera: doc.carrera?.tipo_carrera?.descripcion || '',
                puntaje_total: pt ? pt.puntaje : 0,
                actividades_inscritas: actividadesCount,
                participacion_activa: actividadesCount > 1,
                historial_academico_resumen: ha ? ha.descripcion : ''
            };
        });

        res.json(respuestaFormateada);
    } catch (error) {
        console.error("Error en GET /docentes:", error.message);
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

        // Formatear RUT completo para identificador (ej: 12.345.678-K)
        rutCreado = formatearRutChile(rut_usuario);

        // =========================================================================
        // 1. GENERAR CLAVE INICIAL: RUT SOLO NÚMEROS (sin puntos, guion ni DV)
        // =========================================================================
        const rutLimpio = rut_usuario.toString().replace(/[^0-9kK]/g, '');
        const claveSinDv = rutLimpio.slice(0, -1); // Remueve el dígito verificador
        const contraseniaHasheada = await bcrypt.hash(claveSinDv, 10);

        // Subida de imagen al Storage de Supabase
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

        // 2. Inserción en la tabla usuario
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
                id_periodo_academico: id_periodo_academico || 1,
                id_estado_matricula: id_estado_matricula || 1,
                id_comuna: id_comuna || 1,
                id_sede: id_sede || 1,
                cambio_clave_obligatorio: true, // Obliga al usuario a cambiarla al primer inicio
                contrasenia: contraseniaHasheada
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

        // =========================================================================
        // 3. ENVÍO DE CORREO DE BIENVENIDA Y NOTIFICACIÓN
        // =========================================================================
        const mensajeBienvenida = `¡Bienvenido/a ${nombre_completo}! Tu cuenta ha sido creada. Tu contraseña por defecto son los primeros dígitos de tu RUT (sin puntos, sin guion ni dígito verificador): ${claveSinDv}`;

        // Enviar correo electrónico
        const mailOptions = {
            from: `"Gestión Académica" <${process.env.EMAIL_USER}>`,
            to: correo,
            subject: 'Creación de cuenta y credenciales de acceso',
            text: mensajeBienvenida,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #0056b3; text-align: center;">¡Bienvenido/a al Sistema!</h2>
                <p>Hola <strong>${nombre_completo}</strong>,</p>
                <p>Se ha registrado exitosamente tu cuenta de alumno.</p>
                <p>Tus credenciales de acceso son:</p>
                <ul>
                    <li><strong>Correo:</strong> ${correo}</li>
                    <li><strong>Contraseña por defecto:</strong> ${claveSinDv} <em>(primeros números del RUT sin guion ni DV)</em></li>
                </ul>
                <div style="background-color: #f4f6f8; padding: 12px; border-radius: 5px; text-align: center; margin: 20px 0;">
                    <p style="margin:0; font-size: 13px; color: #555;">Recuerda cambiar tu contraseña en tu primer inicio de sesión por seguridad.</p>
                </div>
            </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.warn("No se pudo enviar el correo de bienvenida:", mailErr.message);
        }

        // Guardar la notificación en la base de datos (id_tipo_notificacion = 2: Creación Cuenta)
        // NOTA: Si en tu base de datos `notificacion.id_canje` es obligatorio (NOT NULL), 
        // asegúrate de modificar la tabla en la BD para permitir NULL en id_canje para este tipo de notificaciones.
        try {
            await supabase.from('notificacion').insert([{
                rut_usuario: rutCreado,
                mensaje: mensajeBienvenida,
                fecha_envio: new Date().toISOString(),
                leido: false,
                id_tipo_notificacion: 2 // Creación Cuenta
            }]);
        } catch (notiErr) {
            console.warn("No se pudo registrar la notificación en la BD:", notiErr.message);
        }

        delete usuarioCreado.contrasenia;

        res.status(201).json({
            mensaje: 'Alumno registrado correctamente con todos sus atributos.',
            usuario: usuarioCreado
        });

    } catch (error) {
        console.error("Error en POST /alumnos:", error.message);
        res.status(400).json({ error: error.message });
    }
});
app.get('/notificaciones/:rut', async (req, res) => {
    try {
        const rutFormateado = formatearRutChile(decodeURIComponent(req.params.rut));

        const { data, error } = await supabase
            .from('notificacion')
            .select(`
                *,
                tipo_notificacion(descripcion)
            `)
            .eq('rut_usuario', rutFormateado)
            .order('fecha_envio', { ascending: false });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error("Error al obtener notificaciones:", error.message);
        res.status(500).json({ error: "Error al obtener las notificaciones del alumno." });
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

    // EDITAR MI PERFIL (Solo Foto, Dirección y Teléfono)
app.put('/alumnos/perfil/:rut', upload.single('foto'), async (req, res) => {
    try {
        const rutFormateado = formatearRutChile(decodeURIComponent(req.params.rut));
        const archivo = req.file;

        let datos = {};
        if (req.body.datos) {
            datos = typeof req.body.datos === 'string' ? JSON.parse(req.body.datos) : req.body.datos;
        } else {
            datos = { ...req.body };
        }

        // Extraemos únicamente los campos permitidos para la edición de perfil
        const { direccion, telefono } = datos;
        const datosAActualizar = {};

        if (direccion !== undefined) datosAActualizar.direccion = direccion;
        if (telefono !== undefined) datosAActualizar.telefono = telefono;

        // Si subió una nueva imagen/foto
        if (archivo) {
            // Obtenemos la imagen actual para eliminarla del storage
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

            datosAActualizar.imagen = publicUrlData.publicUrl;
        }

        // Actualización única sobre la tabla 'usuario'
        const { data: usuarioActualizado, error: userError } = await supabase
            .from('usuario')
            .update(datosAActualizar)
            .eq('rut_usuario', rutFormateado)
            .select()
            .single();

        if (userError) throw userError;

        res.json({
            mensaje: 'Perfil actualizado con éxito.',
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.error("Error en PUT /alumnos/perfil:", error.message);
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

// ELIMINAR ALUMNO Y TODOS SUS REGISTROS ASOCIADOS
app.delete('/alumnos/:rut', async (req, res) => {
    try {
        const rutRecibido = decodeURIComponent(req.params.rut).trim();
        const rutFormateado = formatearRutChile(rutRecibido);

        // 1. Obtener imagen del usuario antes de borrar
        const { data: usuario, error: findError } = await supabase
            .from('usuario')
            .select('imagen, rut_usuario')
            .eq('rut_usuario', rutFormateado)
            .maybeSingle();

        if (findError) throw findError;
        if (!usuario) {
            return res.status(404).json({ error: `El alumno con RUT ${rutFormateado} no existe.` });
        }

        // 2. Eliminar imagen de Storage si aplica
        if (usuario.imagen) {
            try {
                const urlPartes = usuario.imagen.split('/');
                const nombreArchivo = urlPartes[urlPartes.length - 1].split('?')[0];
                await supabase.storage.from('fotos_alumnos').remove([nombreArchivo]);
            } catch (storageErr) {
                console.warn("No se pudo borrar la imagen:", storageErr.message);
            }
        }

        // 3. Borrar usuario (PostgreSQL/Supabase borrará automáticamente todo lo vinculado por CASCADE)
        const { error: deleteDbError } = await supabase
            .from('usuario')
            .delete()
            .eq('rut_usuario', usuario.rut_usuario);

        if (deleteDbError) throw deleteDbError;

        return res.json({ mensaje: 'Alumno y sus registros relacionados fueron eliminados exitosamente.' });

    } catch (error) {
        console.error("Error en DELETE /alumnos:", error.message || error);
        return res.status(500).json({ error: error.message || 'Error interno al eliminar alumno' });
    }
});

    // ==========================================
    // AUTENTICACIÓN
    // ==========================================

app.post('/auth/login', async (req, res) => {
  try {
    const { correo, rut_usuario, password, contrasenia } = req.body;

    const identificador = (correo || rut_usuario || '').trim();
    const claveIngresada = (password || contrasenia || '').trim();

    if (!identificador || !claveIngresada) {
      return res.status(400).json({ error: 'El correo/RUT y la contraseña son obligatorios.' });
    }

    const identificadorLower = identificador.toLowerCase();

    // =========================================================================
    // 1. VALIDACIÓN DEL ADMIN CACHEADO / HARDCODEADO EN LA API
    // =========================================================================
    const ADMIN_CORREO = process.env.ADMIN_EMAIL || 'admin@duocuc.cl';
    const ADMIN_RUT = process.env.ADMIN_RUT || '11111111-1';
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123'; 

    if ((identificadorLower === ADMIN_CORREO.toLowerCase() || identificadorLower === ADMIN_RUT.toLowerCase()) && claveIngresada === ADMIN_PASS) {
      const tokenAcceso = crypto.randomBytes(32).toString('hex');

      return res.json({
        mensaje: 'Autenticación exitosa (Administrador)',
        usuario: {
          rut_usuario: ADMIN_RUT,
          nombre_completo: 'Administrador del Sistema',
          correo: ADMIN_CORREO,
          id_tipo_usuario: 2, // ID Administrador
          id_estado_matricula: 1,
          id_sede: 1,
          cambio_clave_obligatorio: false // El admin NUNCA requiere cambio obligatorio
        },
        token_acceso: tokenAcceso
      });
    }

    // =========================================================================
    // 2. BÚSQUEDA EN BASE DE DATOS (Docentes, Alumnos y Admin registrado en BD)
    // =========================================================================
    let usuario = null;

    // A) Buscar por correo
    if (identificador.includes('@')) {
      const { data: userByEmail } = await supabase
        .from('usuario')
        .select('*')
        .ilike('correo', identificadorLower)
        .limit(1);

      if (userByEmail && userByEmail.length > 0) {
        usuario = userByEmail[0];
      }
    }

    // B) Si no se encontró por correo, buscar por RUT
    if (!usuario) {
      let rutFormateado = identificador;
      if (typeof formatearRutChile === 'function') {
        rutFormateado = formatearRutChile(identificador);
      }

      const { data: userByRut } = await supabase
        .from('usuario')
        .select('*')
        .or(`rut_usuario.eq.${rutFormateado},rut_usuario.eq.${identificador}`)
        .limit(1);

      if (userByRut && userByRut.length > 0) {
        usuario = userByRut[0];
      }
    }

    if (!usuario) {
      console.log(`[LOGIN] Usuario no encontrado para: ${identificador}`);
      return res.status(401).json({ error: 'Correo/RUT o contraseña incorrectos.' });
    }

    // Validar hash de contraseña en la base de datos con Bcrypt
    const hashGuardado = usuario.contrasenia || usuario.contrasena || usuario.password;
    if (!hashGuardado) {
      console.error(`[LOGIN] Usuario ${usuario.rut_usuario} no tiene hash asignado.`);
      return res.status(400).json({ error: 'El usuario no tiene contraseña asignada.' });
    }

    const passwordCorrecta = await bcrypt.compare(claveIngresada, hashGuardado);
    if (!passwordCorrecta) {
      console.log(`[LOGIN] Contraseña incorrecta para: ${identificador}`);
      return res.status(401).json({ error: 'Correo/RUT o contraseña incorrectos.' });
    }

    // Control de estados (2: Suspendido, 3: Inactivo/Retirado)
    if (usuario.id_estado_matricula === 2) {
      return res.status(403).json({ error: 'El usuario se encuentra suspendido.' });
    }
    if (usuario.id_estado_matricula === 3) {
      return res.status(403).json({ error: 'El usuario se encuentra inactivo/deshabilitado.' });
    }

    // Generar token de sesión
    const tokenAcceso = crypto.randomBytes(32).toString('hex');
    try {
      await supabase
        .from('sesion_usuario')
        .upsert(
          { rut_usuario: usuario.rut_usuario, token_acceso: tokenAcceso },
          { onConflict: 'rut_usuario' }
        );
    } catch (sessionErr) {
      console.warn("[LOGIN] Advertencia al guardar sesión:", sessionErr.message);
    }

    // Determinar si exige cambio de clave:
    // Si es Administrador (2) -> SIEMPRE false
    // Si es Alumno (1) o Docente (3) -> Respeta el valor en la base de datos (por defecto true al crearse)
    const esAdmin = Number(usuario.id_tipo_usuario) === 2;
    const cambioObligatorio = esAdmin ? false : (usuario.cambio_clave_obligatorio ?? false);

    delete usuario.contrasenia;
    delete usuario.contrasena;
    delete usuario.password;

    res.json({
      mensaje: 'Autenticación exitosa',
      usuario: {
        ...usuario,
        cambio_clave_obligatorio: cambioObligatorio
      },
      token_acceso: tokenAcceso
    });

  } catch (error) {
    console.error("Error crítico en POST /auth/login:", error);
    res.status(500).json({ error: 'Error interno del servidor.', detalle: error.message });
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

            const codigoNumerico = crypto.randomInt(100000, 1000000).toString();
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
        const tokenInput = req.body.token || req.body.codigo;
        const nuevaPassword = req.body.nueva_contrasenia || req.body.nuevaContrasenia || req.body.password;

        if (!tokenInput || !nuevaPassword) {
            return res.status(400).json({ 
                error: 'El código (token) y la nueva contraseña son obligatorios.' 
            });
        }

        const tokenString = String(tokenInput).trim();

        const { data: registroToken, error: tokenError } = await supabase
            .from('recuperar_contrasenia')
            .select('*')
            .eq('token', tokenString)
            .eq('usado', false)
            .maybeSingle();

        if (tokenError) {
            console.error('Error al consultar token en Supabase:', tokenError);
            return res.status(500).json({ error: 'Error interno de base de datos.' });
        }

        if (!registroToken) {
            return res.status(400).json({ 
                error: 'Código inválido o ya utilizado. Solicita un nuevo código.' 
            });
        }

        const fechaExpiracion = new Date(registroToken.fecha_expiracion).getTime();
        const ahora = new Date().getTime();

        if (fechaExpiracion < ahora) {
            return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
        }

        // Encriptación de la nueva contraseña
        const passwordHash = await bcrypt.hash(nuevaPassword, 10);

        const { error: updateError } = await supabase
            .from('usuario')
            .update({ contrasenia: passwordHash })
            .eq('rut_usuario', registroToken.rut_usuario);

        if (updateError) {
            console.error('Error al actualizar contraseña:', updateError);
            return res.status(500).json({ error: 'No se pudo actualizar la contraseña del usuario.' });
        }

        await supabase
            .from('recuperar_contrasenia')
            .update({ usado: true })
            .eq('id_recuperacion', registroToken.id_recuperacion);

        return res.json({ mensaje: 'Contraseña actualizada con éxito.' });

    } catch (error) {
        console.error('Error inesperado en /auth/restablecer-password:', error.message);
        return res.status(500).json({ error: 'Error del servidor al restablecer contraseña.' });
    }
});

// ==========================================
// CAMBIO DE CONTRASEÑA OBLIGATORIO (PRIMER LOGIN)
// ==========================================
app.put('/auth/cambiar-password-obligatorio', async (req, res) => {
    try {
        const { rut_usuario, nueva_password } = req.body;

        if (!rut_usuario || !nueva_password) {
            return res.status(400).json({ error: 'El RUT y la nueva contraseña son obligatorios.' });
        }

        const rutEntrada = rut_usuario.toString().trim();
        const rutSinPuntos = rutEntrada.replace(/\./g, '');
        
        let rutFormateado = rutSinPuntos;
        if (typeof formatearRutChile === 'function') {
            rutFormateado = formatearRutChile(rutSinPuntos);
        }

        // 1. Buscar al usuario probando los formatos en un arreglo seguro (.in)
        const rutsABuscar = Array.from(new Set([rutEntrada, rutSinPuntos, rutFormateado]));
        
        const { data: usuarios, error: userError } = await supabase
            .from('usuario')
            .select('rut_usuario, id_tipo_usuario')
            .in('rut_usuario', rutsABuscar)
            .limit(1);

        if (userError || !usuarios || usuarios.length === 0) {
            console.error('[CAMBIO CLAVE ERROR] No se encontró usuario para los RUTs:', rutsABuscar);
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const usuarioBD = usuarios[0];

        // Excluir al Administrador
        if (Number(usuarioBD.id_tipo_usuario) === 2) {
            return res.status(403).json({ error: 'El Administrador no utiliza este flujo.' });
        }

        // 2. Encriptar la nueva contraseña limpia
        const nuevaPasswordHasheada = await bcrypt.hash(nueva_password.toString().trim(), 10);

        // 3. Actualizar contraseña y cambiar flag usando el RUT exacto guardado en la BD
        const { data: updateResult, error: updateError } = await supabase
            .from('usuario')
            .update({
                contrasenia: nuevaPasswordHasheada,
                cambio_clave_obligatorio: false
            })
            .eq('rut_usuario', usuarioBD.rut_usuario)
            .select(); // <--- OBLIGATORIO: devuelve los registros modificados

        if (updateError) {
            console.error('[CAMBIO CLAVE ERROR] Error al actualizar en Supabase:', updateError.message);
            throw updateError;
        }

        if (!updateResult || updateResult.length === 0) {
            console.error('[CAMBIO CLAVE ERROR] No se actualizó ninguna fila en Supabase para:', usuarioBD.rut_usuario);
            return res.status(500).json({ error: 'No se pudo actualizar el registro en la base de datos.' });
        }

        console.log(`[CAMBIO CLAVE ÉXITO] Se actualizó contraseña y cambio_clave_obligatorio = false para ${usuarioBD.rut_usuario}`);

        return res.json({ mensaje: 'Contraseña actualizada con éxito.' });

    } catch (error) {
        console.error("Error en /auth/cambiar-password-obligatorio:", error.message);
        res.status(500).json({ error: 'Error al actualizar la contraseña.' });
    }
});
// ==========================================
// CAMBIO DE CONTRASEÑA DESDE EL PERFIL
// ==========================================
app.put('/auth/cambiar-password-perfil', async (req, res) => {
    try {
        const { rut_usuario, nueva_password } = req.body;

        if (!rut_usuario || !nueva_password) {
            return res.status(400).json({ 
                error: 'El RUT y la nueva contraseña son obligatorios.' 
            });
        }

        const rutFormateado = formatearRutChile(rut_usuario);

        // 1. Verificar si el usuario existe
        const { data: usuario, error: userError } = await supabase
            .from('usuario')
            .select('rut_usuario')
            .eq('rut_usuario', rutFormateado)
            .maybeSingle();

        if (userError) {
            console.error('Error al consultar usuario en Supabase:', userError);
            return res.status(500).json({ error: 'Error interno de base de datos.' });
        }

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // 2. Encriptar la nueva contraseña
        const nuevaPasswordHasheada = await bcrypt.hash(nueva_password, 10);

        // 3. Actualizar contraseña y quitar bandera de cambio obligatorio si existía
        const { error: updateError } = await supabase
            .from('usuario')
            .update({
                contrasenia: nuevaPasswordHasheada,
                cambio_clave_obligatorio: false
            })
            .eq('rut_usuario', rutFormateado);

        if (updateError) {
            console.error('Error al actualizar contraseña desde el perfil:', updateError);
            return res.status(500).json({ error: 'No se pudo actualizar la contraseña del usuario.' });
        }

        return res.json({ mensaje: 'Contraseña actualizada con éxito.' });

    } catch (error) {
        console.error('Error inesperado en /auth/cambiar-password-perfil:', error.message);
        return res.status(500).json({ error: 'Error del servidor al cambiar la contraseña.' });
    }
});

// =========================================================================
// 1. CREAR DOCENTE Y ENVIAR CREDENCIALES POR CORREO (id_tipo_usuario: 3)
// =========================================================================
app.post('/docentes', upload.single('foto'), async (req, res) => {
    let nombreArchivoGuardado = null;
    let rutCreado = null;

    try {
        const archivo = req.file;
        let urlImagenFinal = null;
        let datosDocente;

        if (req.body.datos) {
            datosDocente = typeof req.body.datos === 'string' ? JSON.parse(req.body.datos) : req.body.datos;
        } else {
            datosDocente = req.body || {};
        }

        const { 
            rut_usuario, nombre_completo, genero, correo, direccion, 
            telefono, fecha_nacimiento, id_sede, password,
            id_periodo_academico, id_estado_matricula, id_comuna
        } = datosDocente;

        if (!rut_usuario || !nombre_completo || !correo || !id_sede) {
            return res.status(400).json({ error: "El RUT, nombre completo, correo y sede son obligatorios." });
        }

        // Formatear RUT completo para identificador (ej: 12.345.678-K)
        rutCreado = formatearRutChile(rut_usuario);

        // =========================================================================
        // 1. GENERAR CLAVE INICIAL: RUT SOLO NÚMEROS (sin puntos, guion ni DV)
        // =========================================================================
        const rutLimpio = rut_usuario.toString().replace(/[^0-9kK]/g, '');
        const claveSinDv = rutLimpio.slice(0, -1);
        const claveAUsar = (password && password.trim() !== '') ? password.trim() : claveSinDv;

        const contraseniaHasheada = await bcrypt.hash(claveAUsar, 10);

        // Subida de imagen al Storage de Supabase
        if (archivo) {
            const extension = archivo.originalname.split('.').pop();
            nombreArchivoGuardado = `docente_${rutCreado}_${Date.now()}.${extension}`;
            
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

        // 2. Inserción en la tabla usuario (Valores por defecto aplicados como en alumnos)
        const { data: docenteCreado, error: userError } = await supabase
            .from('usuario')
            .insert([{
                rut_usuario: rutCreado,
                nombre_completo,
                genero: genero || 'Masculino',
                correo,
                direccion: direccion || 'Sin especificar',
                telefono: telefono ? String(telefono) : ' ',
                fecha_nacimiento: fecha_nacimiento || null,
                imagen: urlImagenFinal,
                id_tipo_usuario: 3, // ID asignado para Docentes
                id_sede: Number(id_sede),
                id_periodo_academico: id_periodo_academico || 1,
                id_estado_matricula: id_estado_matricula || 1, // 1: Activo
                id_comuna: id_comuna || 1,
                cambio_clave_obligatorio: true, // Obliga al docente a cambiarla al primer inicio
                contrasenia: contraseniaHasheada
            }])
            .select()
            .single();

        if (userError) throw userError;

        // =========================================================================
        // 3. ENVÍO DE CORREO DE BIENVENIDA Y NOTIFICACIÓN
        // =========================================================================
        const mensajeBienvenida = `¡Bienvenido/a Profesor/a ${nombre_completo}! Su cuenta docente ha sido habilitada. Su contraseña de acceso inicial es: ${claveAUsar}`;

        // Enviar correo electrónico
        const mailOptions = {
            from: `"Gestión Académica" <${process.env.EMAIL_USER}>`,
            to: correo,
            subject: 'Creación de cuenta docente y credenciales de acceso',
            text: mensajeBienvenida,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #0056b3; text-align: center;">¡Bienvenido/a al Panel Docente!</h2>
                <p>Estimado/a profesor/a <strong>${nombre_completo}</strong>,</p>
                <p>Le informamos que se ha registrado exitosamente su cuenta docente en la plataforma institucional.</p>
                <p>A continuación se detallan sus credenciales de acceso:</p>
                <ul>
                    <li><strong>Correo Institucional:</strong> ${correo}</li>
                    <li><strong>Contraseña inicial:</strong> ${claveAUsar}</li>
                </ul>
                <div style="background-color: #f4f6f8; padding: 12px; border-radius: 5px; text-align: center; margin: 20px 0;">
                    <p style="margin:0; font-size: 13px; color: #555;">Por motivos de seguridad, recuerde cambiar su contraseña al iniciar sesión por primera vez.</p>
                </div>
            </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.warn("No se pudo enviar el correo al docente:", mailErr.message);
        }

        // Registrar notificación interna
        try {
            await supabase.from('notificacion').insert([{
                rut_usuario: rutCreado,
                mensaje: mensajeBienvenida,
                fecha_envio: new Date().toISOString(),
                leido: false,
                id_tipo_notificacion: 2 // Creación Cuenta
            }]);
        } catch (notiErr) {
            console.warn("No se pudo registrar la notificación en la BD:", notiErr.message);
        }

        delete docenteCreado.contrasenia;

        res.status(201).json({
            mensaje: 'Docente registrado correctamente con todos sus atributos.',
            usuario: docenteCreado
        });

    } catch (error) {
        console.error("Error en POST /docentes:", error.message);
        res.status(400).json({ error: error.message });
    }
});
// =========================================================================
// 2. EDITAR DOCENTE (Nombre, Correo, Género, Sede)
// =========================================================================
// PUT /docentes/:rut - Editar datos de un docente
app.put('/docentes/:rut', async (req, res) => {
    try {
        const { rut } = req.params;

        if (!rut) {
            return res.status(400).json({ error: 'El RUT es obligatorio.' });
        }

        const rutEntrada = rut.toString().trim();
        const rutSinPuntos = rutEntrada.replace(/\./g, '');
        
        let rutFormateado = rutSinPuntos;
        if (typeof formatearRutChile === 'function') {
            rutFormateado = formatearRutChile(rutSinPuntos);
        }

        // 1. Buscar al docente en la base de datos probando los formatos posibles
        const rutsABuscar = Array.from(new Set([rutEntrada, rutSinPuntos, rutFormateado]));
        
        const { data: usuarios, error: searchError } = await supabase
            .from('usuario')
            .select('*')
            .in('rut_usuario', rutsABuscar)
            .limit(1);

        if (searchError || !usuarios || usuarios.length === 0) {
            console.error('[EDITAR DOCENTE ERROR] No se encontró el docente:', rutsABuscar, searchError);
            return res.status(404).json({ error: 'Docente no encontrado en la base de datos.' });
        }

        const docenteBD = usuarios[0];

        // 2. Extraer los datos del body enviando solo las columnas estándar de la tabla 'usuario'
        const { nombre_completo, correo, genero, telefono, id_sede } = req.body;
        const updatePayload = {};

        if (nombre_completo) {
            updatePayload.nombre_completo = nombre_completo.toString().trim();
        }

        if (correo) {
            // Detectar cuál columna de correo existe en el objeto cargado de la BD
            const columnaCorreo = ('correo_institucional' in docenteBD) ? 'correo_institucional' : 'correo';
            updatePayload[columnaCorreo] = correo.toString().trim().toLowerCase();
        }

        if (telefono !== undefined && telefono !== null) {
            updatePayload.telefono = telefono.toString().trim();
        }

        if (genero) {
            updatePayload.genero = genero;
        }

        if (id_sede && !isNaN(Number(id_sede))) {
            updatePayload.id_sede = Number(id_sede);
        }

        console.log(`[EDITAR DOCENTE DEBUG] Actualizando RUT ${docenteBD.rut_usuario} con payload:`, updatePayload);

        // 3. Ejecutar UPDATE en Supabase usando el RUT exacto de la BD
        const { data: updateResult, error: updateError } = await supabase
            .from('usuario')
            .update(updatePayload)
            .eq('rut_usuario', docenteBD.rut_usuario)
            .select();

        if (updateError) {
            console.error('[EDITAR DOCENTE DETALLE ERROR SUPABASE]:', updateError);
            return res.status(500).json({ error: updateError.message || 'Error al actualizar en la base de datos.' });
        }

        console.log(`[EDITAR DOCENTE ÉXITO] Docente ${docenteBD.rut_usuario} actualizado correctamente.`);

        return res.json({
            mensaje: 'Datos del docente actualizados con éxito.',
            usuario: updateResult[0]
        });

    } catch (error) {
        console.error("Error crítico en PUT /docentes/:rut:", error);
        res.status(500).json({ error: error.message || 'Error interno del servidor.' });
    }
});

// =========================================================================
// 3. CAMBIAR ESTADO DE DOCENTE (Deshabilitar id_estado_matricula: 3 / Activar id_estado_matricula: 1)
// =========================================================================
app.put('/docentes/:rut/estado', async (req, res) => {
    try {
        const { rut } = req.params;
        const { id_estado_matricula } = req.body; // 3: Retirado/Inactivo, 1: Activo

        if (!id_estado_matricula) {
            return res.status(400).json({ error: "El campo id_estado_matricula es requerido." });
        }

        const rutSanitizado = formatearRutChile(rut);

        const { data: docenteEstado, error } = await supabase
            .from('usuario')
            .update({ id_estado_matricula: Number(id_estado_matricula) })
            .eq('rut_usuario', rutSanitizado)
            .eq('id_tipo_usuario', 3)
            .select()
            .single();

        if (error) throw error;

        const estadoTexto = Number(id_estado_matricula) === 3 ? 'deshabilitado' : 'habilitado';

        res.json({
            mensaje: `El docente ha sido ${estadoTexto} correctamente.`,
            usuario: docenteEstado
        });

    } catch (error) {
        console.error("Error en PUT /docentes/:rut/estado:", error.message);
        res.status(400).json({ error: error.message });
    }
});
    // ==========================================
    // INICIO DEL SERVIDOR
    // ==========================================
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
