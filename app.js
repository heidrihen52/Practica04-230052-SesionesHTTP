import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import macaddress from 'macaddress';
import moment from 'moment-timezone';
import mongoose from 'mongoose'; // Importamos Mongoose

const app = express();
const PORT = 3000;

// MongoDB Atlas URI
const MONGO_URI = 'mongodb+srv://230052:Taco1995@hadrycluster.lbdby.mongodb.net/sessions?retryWrites=true&w=majority'; // Reemplaza <password> con tu contraseña

// Conectar a MongoDB Atlas
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch((error) => console.error('Error al conectar con MongoDB Atlas:', error));

// Modelo de datos para sesiones (opcional, si necesitas almacenar en MongoDB)
const SessionSchema = new mongoose.Schema({
  sessionID: String,
  email: String,
  nickname: String,
  macAddress: String,
  createdAt: String,
  lastAccessed: String,
  serverIp: String,
  serverMac: String,
});

const SessionModel = mongoose.model('Session', SessionSchema);

app.listen(PORT, () => {
  console.log(`Server iniciado en http://localhost:${PORT}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessions = {};

app.use(
  session({
    secret: "p4-APJ#pixelg7hadry-SesionesHTTP",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 5 * 60 * 1000 }
  })
);

app.get('/', (req, res) => {
  return res.status(200).json({
    message: 'Bienvenido a la API de control de sesiones',
    author: 'Adrián Pérez Jiménez'
  });
});

const getLocalIp = () => {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
};

const getServerMac = () => {
  return new Promise((resolve, reject) => {
    macaddress.one((err, mac) => {
      if (err) {
        reject(err);
      }
      resolve(mac);
    });
  });
};

app.post('/login', async (req, res) => {
  const { email, nickname, macAddress } = req.body;
  if (!email || !nickname || !macAddress) {
    return res.status(400).json({
      message: 'Se esperan campos requeridos'
    });
  }

  const sessionID = uuidv4();
  const createdAt_CDMX = moment().tz('America/Mexico_City').format('YYYY/MM/DD HH:mm:ss');

  req.session.email = email;
  req.session.sessionID = sessionID;
  req.session.nickname = nickname;
  req.session.macAddress = macAddress;
  req.session.createdAt = createdAt_CDMX;
  req.session.lastAccessed = createdAt_CDMX;
  req.session.serverIp = getLocalIp();
  req.session.serverMac = await getServerMac();

  sessions[sessionID] = req.session;

  // Guardar la sesión en la base de datos
  const sessionData = new SessionModel({
    sessionID,
    email,
    nickname,
    macAddress,
    createdAt: createdAt_CDMX,
    lastAccessed: createdAt_CDMX,
    serverIp: req.session.serverIp,
    serverMac: req.session.serverMac,
  });

  try {
    await sessionData.save();
    res.status(200).json({
      message: 'Se ha logueado de manera exitosa',
      sessionID
    });
  } catch (error) {
    console.error('Error al guardar la sesión:', error);
    res.status(500).json({ message: 'Error al guardar la sesión' });
  }
});



app.post('/logout', async (req, res) => {
    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({
            message: 'No existe una sesión activa'
        });
    }

    const sessionID = req.session.sessionID;

    // Actualizar el estado de la sesión en la base de datos (opcional)
    try {
        await SessionModel.updateOne(
            { sessionID }, // Filtro por el ID de la sesión
            { $set: { active: false, lastAccessed: moment().tz('America/Mexico_City').format('YYYY/MM/DD HH:mm:ss') } } // Cambia el estado a inactivo
        );
    } catch (error) {
        console.error('Error al actualizar el estado de la sesión:', error);
        return res.status(500).json({ message: 'Error al cerrar la sesión en la base de datos' });
    }

    // Eliminar la sesión activa en memoria
    delete sessions[sessionID];

    // Destruir la sesión en el servidor
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                message: 'Error al cerrar sesión'
            });
        }
    });

    res.status(200).json({
        message: 'Logout exitoso'
    });
});

app.post('/update', (req, res) => {
    const { email, nickname } = req.body;

    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({
            message: 'No existe una sesión activa'
        });
    }

    if (email) req.session.email = email;
    if (nickname) req.session.nickname = nickname;
    req.session.lastAccessed = moment().tz('America/Mexico_City').format('YYYY/MM/DD HH:mm:ss');

    sessions[req.session.sessionID] = req.session;

    res.status(200).json({
        message: 'Datos actualizados',
        session: req.session
    });
});

app.get('/status', (req, res) => {
    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({
            message: 'No existe una sesión activa'
        });
    }

    const session = sessions[req.session.sessionID];
    const now = moment();
    const idleTime = now.diff(moment(session.lastAccessed, 'YYYY/MM/DD HH:mm:ss'), 'seconds');
    const duration = now.diff(moment(session.createdAt, 'YYYY/MM/DD HH:mm:ss'), 'seconds');

    res.status(200).json({
        message: 'Sesión activa',
        session,
        idleTime: `${idleTime} segundos`,
        duration: `${duration} segundos`
    });
});

app.get('/sessions', (req, res) => {
    if (Object.keys(sessions).length === 0) {
        return res.status(404).json({
            message: 'No hay sesiones activas'
        });
    }

    const formattedSessions = {};
    for (const sessionID in sessions) {
        const session = sessions[sessionID];
        formattedSessions[sessionID] = {
            ...session,
            createdAt: moment(session.createdAt).tz('America/Mexico_City').format('YYYY/MM/DD HH:mm:ss'),
            lastAccessed: moment(session.lastAccessed).tz('America/Mexico_City').format('YYYY/MM/DD HH:mm:ss')
        };
    }

    res.status(200).json({
        message: 'Sesiones activas',
        sessions: formattedSessions
    });
});

setInterval(() => {
    const now = moment();
    for (const sessionID in sessions) {
        const session = sessions[sessionID];
        const idleTime = now.diff(moment(session.lastAccessed, 'YYYY/MM/DD HH:mm:ss'), 'seconds');
        if (idleTime > 120) { 
            delete sessions[sessionID];
        }
    }
}, 60000);

/*
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import macaddress from 'macaddress';

const app = express();
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server iniciado en http://localhost:${PORT}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessions = {};

app.use(
    session({
        secret: "p4-APJ#pixelg7hadry-SesionesHTTP",
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 5 * 60 * 1000 }
    })
);

app.get('/', (req, res) => {
    return res.status(200).json({
        message: 'Bienvendio a la API de control de sesiones',
        author: 'Adrián Pérez Jiménez'
    });
});

const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
}

const getLocalIp = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null; 
};

const getServerMac = () => {
    return new Promise((resolve, reject) => {
        macaddress.one((err, mac) => {
            if (err) {
                reject(err);
            }
            resolve(mac);
        });
    });
};

app.post('/login', async (req, res) => {
    const { email, nickname, macAddress } = req.body;
    if (!email || !nickname || !macAddress ) {
        return res.status(400).json({
            message: 'Se esperan campos requeridos'
        });
    }

    const sessionID = uuidv4();
    req.session.email = email;
    req.session.sessionID = sessionID;
    req.session.nickname = nickname;
    req.session.macAddress = macAddress;
    req.session.createdAt = new Date();
    req.session.lastAccessed = new Date();
    req.session.serverIp = getLocalIp();
    req.session.serverMac = await getServerMac();

    sessions[sessionID] = req.session;

    res.status(200).json({
        message: 'Se ha logueado de manera exitosa',
        sessionID
    });
});

app.post("/logout", (req, res) => {
    const { email, nickname } = req.body;

    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({
            message: 'No existe una sesión activa'
        });
    }
    if (email) req.session.email = email;
    if (nickname) req.session.nickname = nickname;

    delete sessions[req.session.sessionID];
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                message: 'Error al cerrar sesión'
            });
        }
    });

    res.status(200).json({
        message: 'Logout exitoso'
    });
});

app.post("/update", (req, res) => {
    const { email, nickname } = req.body;

    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({
            message: 'No existe una sesión activa'
        });
    }
    if (email) req.session.email = email;
    if (nickname) req.session.nickname = nickname;
    req.session.lastAccessed = new Date();

    sessions[req.session.sessionID] = req.session;

    res.status(200).json({
        message: 'Datos actualizados',
        session: req.session
    });
});

app.get("/status", (req, res) => {
    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({
            message: 'No existe una sesión activa'
        });
    }

    const session = sessions[req.session.sessionID];
    const now = new Date();
    const idleTime = (now - new Date(session.lastAccessed)) / 1000;
    const duration = (now - new Date(session.createdAt)) / 1000; 

    res.status(200).json({
        message: 'Sesión activa',
        session,
        idleTime: `${idleTime} segundos`,
        duration: `${duration} segundos`
    });
});
app.get('/sessionactives', (req, res) => {
    if (Object.keys(sessions).length === 0) {
        return res.status(404).json({
            message: 'No hay sesiones activas'
        });
    }
    res.status(200).json({
        message: 'Sesiones activas',
        sessions
    });
});

setInterval(() => {
    const now = new Date();
    for (const sessionID in sessions) {
        const session = sessions[sessionID];
        const idleTime = (now - new Date(session.lastAccessed)) / 1000; 
        if (idleTime > 120) { // 2 minutos
            delete sessions[sessionID];
        }
    }
}, 60000);
*/