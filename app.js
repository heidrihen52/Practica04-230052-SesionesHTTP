import express from 'express';
import bodyParser from 'body-parser';
import {v4 as uuidv4} from 'uuid';
import session from 'express-session';
import moment from 'moment-timezone'

const app = express();

// Configuración del middleware de sesiones

app.use(
    session({
        secret:'p3-APJ#pixelg7hadry-SesionesPersistentes',
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 24 * 60 * 60 * 1000} // 1 día
    })
)

// Ruta para inicializar la sesión
app.get('/iniciar-sesion',(req,res)=>{
    if (!req.session.inicio){
        req.session.inicio=new Date();
        req.session.ultimoAcceso=new Date();
        res.send('Sesión Iniciada.');
    } else {
        res.send('La sesión ya está activa.');
    }
})

// Ruta para actualizar la fecha de última consulta
app.get('/actualizar',(req,res)=>{
    if (req.session.inicio){
        req.session.ultimoAcceso = new Date();
        res.send('Fecha de última consulta actualizada.');
    } else {
        res.send('No hay una sesión activa.');
    }
})

// Ruta para ver el estado de la sesión
app.get('/estado-sesion', (req,res)=>{
    if (req.session.inicio){
        const inicio = new Date(req.session.inicio);
        const ultimoAcceso = new Date(req.session.ultimoAcceso);
        const ahora = new Date();

        // Calcular la antiguedad de la sesión
        const antiguedadMs = ahora - inicio;
        const horas = Math.floor(antiguedadMs/(1000 * 60 * 60));
        const minutos = Math.floor((antiguedadMs%(1000*60*60))/(1000*60));
        const segundos = Math.floor((antiguedadMs%(1000*60))/1000);
        
        //Crear uuid unico
        const uuid = uuidv4();

        // Convertimos las fechas al huso horario de CDMX
        const inicioCDMX = moment(inicio).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss')
        const ultimoAccesoCDMX = moment(ultimoAcceso).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss')
        res.json({
            mensaje: 'Estado de la sesión',
            sesionTD: req.sessionID,
            inicio: inicioCDMX,
            ultimoAcceso: ultimoAccesoCDMX,
            UUID: uuid,
            antiguedad: `${horas} horas, ${minutos} minutos, ${segundos} segundos`
        })
    } else {
        res.send('No hay una sesión activa')
    }
})

// Ruta para cerrar la sesión
app.get('/cerrar-sesion', (req,res)=>{
    if (req.session){
        req.session.destroy((err)=>{
            if(err){
                return res.status(500).send('Error al iniciar la sesión')
            }
            res.send('Sesión cerrada correctamente')
        });
    } else {
        res.send('No hay una sesión activa para cerrar.')
    }
})

const PORT = 3000;
app.listen(PORT,()=>{
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`)
})