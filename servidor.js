const express = require('express');
const fs = require('fs').promises;
const fsSincrono = require('fs');
const path = require('path');
const cors = require('cors');
const ExcelJS = require('exceljs');

const app = express();
const ARCHIVO_CSV = path.join(__dirname, 'registro_cargas.csv');
const RUTA_TXT = path.join(__dirname, 'CLI.TXT');

app.use(cors());
app.use(express.json());

// 1. Verificar patente
app.get('/verificar-patente', (req, res) => {
    try {
        const patenteBuscada = req.query.patente.toUpperCase().replace(/\s+/g, '').trim();
        if (!fsSincrono.existsSync(RUTA_TXT)) return res.status(500).send("No se encontró CLI.TXT");
        const contenido = fsSincrono.readFileSync(RUTA_TXT, 'utf-8');
        const lineas = contenido.split('\n');
        let cliente = null;
        for (let linea of lineas) {
            if (linea.toUpperCase().replace(/\s+/g, '').includes(patenteBuscada)) {
                cliente = { nombre: linea.replace(/\s+/g, ' ').trim() };
                break;
            }
        }
        if (cliente) res.status(200).json({ patente: patenteBuscada, nombre: cliente.nombre });
        else res.status(404).send("No registrado");
    } catch (e) { res.status(500).send("Error"); }
});

// 2. Guardar carga
app.post('/guardar-carga', async (req, res) => {
    try {
        const { patente, monto, total } = req.body;
        const fecha = new Date().toISOString().split('T')[0];
        const hora = new Date().toLocaleTimeString();
        const descuento = (monto * 0.05).toFixed(2);
        const linea = `"${fecha}","${hora}","${patente}","${monto}","${descuento}","${total}"\n`;
        await fs.appendFile(ARCHIVO_CSV, linea);
        res.status(200).json({ status: "ok" });
    } catch (e) { res.status(500).json({ status: "error" }); }
});

// 3. Obtener total descuento
app.get('/total-descuento-dia', (req, res) => {
    try {
        if (!fsSincrono.existsSync(ARCHIVO_CSV)) return res.json({ total: "0.00" });
        const hoy = new Date().toISOString().split('T')[0];
        const contenido = fsSincrono.readFileSync(ARCHIVO_CSV, 'utf-8');
        const filas = contenido.split('\n');
        let total = 0;
        filas.forEach(f => { if(f.includes(hoy)) total += parseFloat(f.split(',')[4] || 0); });
        res.status(200).json({ total: total.toFixed(2) });
    } catch (e) { res.status(500).json({ total: "0.00" }); }
});

// 4. Cerrar turno
app.get('/cerrar-turno', (req, res) => {
    try {
        if (fsSincrono.existsSync(ARCHIVO_CSV)) {
            const fechaCierre = new Date().toISOString().split('T')[0] + "_" + Date.now();
            fsSincrono.renameSync(ARCHIVO_CSV, path.join(__dirname, `ventas_${fechaCierre}.csv`));
        }
        fsSincrono.writeFileSync(ARCHIVO_CSV, '');
        res.status(200).json({ message: "Turno cerrado" });
    } catch (e) { res.status(500).json({ message: "Error" }); }
});

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));