const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); 
const app = express();

app.use(cors());
app.use(express.json());

const ARCHIVO_CSV = path.join(__dirname, 'registro_cargas.csv');

// 1. Recibe los datos del celular del playero
app.post('/guardar-carga', (req, res) => {
    try {
        const { patente, monto, total } = req.body;
        const opcionesFecha = { timeZone: "America/Argentina/Buenos_Aires", year: 'numeric', month: '2-digit', day: '2-digit' };
        const opcionesHora = { timeZone: "America/Argentina/Buenos_Aires", hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        
        const fechaHoy = new Date().toLocaleDateString("es-AR", opcionesFecha).split('/').reverse().join('-'); 
        const horaHoy = new Date().toLocaleTimeString("es-AR", opcionesHora);
        const descuento = (parseFloat(monto) * 0.05).toFixed(2);
        
        if (!fs.existsSync(ARCHIVO_CSV)) {
            fs.writeFileSync(ARCHIVO_CSV, "sep=,\nFecha,Hora,Patente,Monto Base,Descuento ($),Total Cobrado\n", 'utf8');
        }
        
        const nuevaLinea = `"${fechaHoy}","${horaHoy}","${patente.toUpperCase().trim()}","${parseFloat(monto).toFixed(2)}","${descuento}","${parseFloat(total).toFixed(2)}"\n`;
        fs.appendFileSync(ARCHIVO_CSV, nuevaLinea, 'utf8');
        
        console.log(`[CUPÓN REGISTRADO] ${fechaHoy} | Patente: ${patente.toUpperCase().trim()}`);
        res.status(200).json({ status: "success" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error" });
    }
});

// 2. Ruta de descarga del reporte para vos
app.get('/descargar-reporte', (req, res) => {
    if (!fs.existsSync(ARCHIVO_CSV)) return res.status(404).send("No hay datos.");
    try {
        const contenido = fs.readFileSync(ARCHIVO_CSV, 'utf8');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_GNC.csv`);
        res.send(Buffer.from('\uFEFF' + contenido, 'utf-8'));
    } catch (error) {
        res.status(500).send("Error.");
    }
});

// 3. NUEVA RUTA: Consulta de ahorro semanal para el cliente
app.get('/ahorro-cliente/:patente', (req, res) => {
    const patenteBuscada = req.params.patente.toUpperCase().trim();
    if (!fs.existsSync(ARCHIVO_CSV)) {
        return res.json({ totalAhorrado: "0.00", historial: [] });
    }

    try {
        const contenido = fs.readFileSync(ARCHIVO_CSV, 'utf8');
        const lineas = contenido.split('\n');
        
        // Calculamos la fecha de hace 7 días
        const hoy = new Date();
        const hace7Dias = new Date(hoy.setDate(hoy.getDate() - 7));

        let totalAhorrado = 0;
        let historial = [];

        for (let i = 2; i < lineas.length; i++) {
            if (!lineas[i].trim()) continue;
            const columnas = lineas[i].split(',').map(col => col.replace(/"/g, '').trim());
            
            if (columnas.length >= 6) {
                const fechaCarga = columnas[0]; // AAAA-MM-DD
                const patenteCarga = columnas[2].toUpperCase();
                const descCarga = parseFloat(columnas[4]) || 0;
                const totalCarga = parseFloat(columnas[5]) || 0;

                const fechaObjeto = new Date(fechaCarga);

                // Si es la patente del cliente y fue en los últimos 7 días
                if (patenteCarga === patenteBuscada && fechaObjeto >= hace7Dias) {
                    totalAhorrado += descCarga;
                    historial.push({
                        fecha: fechaCarga,
                        ahorro: descCarga.toFixed(2),
                        total: totalCarga.toFixed(2)
                    });
                }
            }
        }

        res.json({
            patente: patenteBuscada,
            totalAhorrado: totalAhorrado.toFixed(2),
            historial: historial.reverse() // Mostrar lo más nuevo primero
        });
    } catch (error) {
        res.status(500).json({ error: "Error en la consulta" });
    }
});

app.listen(3000, () => {
    console.log("⛽ Servidor cliente-servidor activo en el puerto 3000");
});