import express from 'express';
import bodyParser from 'body-parser';
import {v4 as uuidv4} from 'uuid';
import session from 'express-session';
import moment from 'moment-timezone';
import os from 'os';

const app = express();
//middleware para manejar datos codificados  en url
app.use(express.urlencoded({extended:true}))
//midleware para manejar datos json
app.use(express.json())

app.use(
    session({
        secret:'p4-APJ#pixelg7hadry-SesionesHTTP',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 5 * 60 * 1000} 
    })
)

//sesiones almacenadas en memoria RAM
const sessions={}
//Funcion que nos permite acceder a la informacion de la interfaz de red en este caso LAN
const getclienteIp = (req) => {
    
    return(
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket?.remoteAddress
    )
};


//Login endpoint
app.post("/login", (req,res)=>{ 
    console.log(req);
    const {email,nickname,macAddress}=req.body;
    if(!email || !nickname || !macAddress){
        return res.status(400).json({message:"Se esperan campos requeridos"})
    }
    const sessionID =uuidv4();
    const now = new Date();

    session[sessionID]={
        sessionID,
        email,
        nickname,
        macAddress,
        ip:getclienteIp(req),
        createdAt:now,
        lastAccessed:now

    }

    res.status(200).json({
        message:"Se ha logueado de manera exitosa",
        sessionID,
    });
});

//logout enpoint
app.post('/logout',(req,res)=> {
    const {sessionID}=req.body;
    if(!sessionID || !session[sessionID]){
        return res.status(404).json({message:"No se ha encontrado sesion acticva"})
    }
    delete session[sessionID];
    req.session.destroy((err)=>{
        if(err){
            return res.status(500).send('Error al cerrar la sesión');
        }
        })
    res.status(200).json({message:"Sesion cerrada exitosamente"}); 
})

//actualizar la sesion
app.put("/update",(req,res)=>{
    const{sessionID,email,nickname}=req.body;
    if(!sessionID || !session[sessionID]){
        return res.status(404).json({message:"no existe una sesión activa"})
    }

    if(email) sessions[sessionID].email=email;
    if(nickname) session[sessionID].nickname=nickname;
    session[sessionID].lastAccessed=new Date();
})

//Estatus
 app.get("/status", (req,res)=>{
    const sessionID = req.query.sessionID;
    
    if(!sessionID || !session[sessionID]){
        return res.status(404).json({message:"No hay sesion activa"})
    }
    res.status(200).json({
        message:"sesion activa",
        session:session[sessionID]
    })
 });

 //Endpoint para listar las sesiones activas
 

 ///configurar cors

const PORT = 3000;
app.listen(PORT,()=>{
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`)
})

/*
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
        req.session.uuid=uuidv4(); //al iniciar la sesión se crea un nuevo uuid, el cual se mantiene hasta que se cierre la sesión
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
        
        

        // Convertimos las fechas al huso horario de CDMX
        const inicioCDMX = moment(inicio).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss')
        const ultimoAccesoCDMX = moment(ultimoAcceso).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss')

        // Obtener la IP del cliente
        const ipCliente = req.ip;

        // Obtener la IP y dirección MAC del servidor
        const interfaces = os.networkInterfaces();
        let ipServidor = '';
        let macServidor = '';

        for (const interfaceName in interfaces) {
            for (const interfaceDetails of interfaces[interfaceName]) {
                if (interfaceDetails.family === 'IPv4' && !interfaceDetails.internal) {
                    ipServidor = interfaceDetails.address;
                    macServidor = interfaceDetails.mac;
                    break;
                }
            }
        }

        res.json({
            mensaje: 'Estado de la sesión',
            sesionTD: req.sessionID,
            uuid: req.session.uuid,  //Aqui se solicta el uui generado en el endpoint de iniciar sesion
            inicio: inicioCDMX,
            ultimoAcceso: ultimoAccesoCDMX,
            antiguedad: `${horas} horas, ${minutos} minutos, ${segundos} segundos`,
            ipCliente: ipCliente, // Dirección IP del cliente
            ipServidor: ipServidor, // Dirección IP del servidor
            macServidor: macServidor, // Dirección MAC del servidor
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
*/