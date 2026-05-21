const express = require('express');
const fs = require('fs').promises;
const fsSincrono = require('fs');
const path = require('path');
const cors = require('cors');
const ExcelJS = require('exceljs');

const app = express();
const ARCHIVO_CSV = path.join(__dirname, 'registro_cargas.csv');

app.use(cors());
app.use(express.json());

// 1. Ruta para verificar patente
app.get('/verificar-patente', (req, res) => {
    try {
        const patenteBuscada = req.query.patente.toUpperCase().replace(/\s+/g, '').trim();
        const rutaTxt = path.join(__dirname, 'CLI.TXT');

        if (!fsSincrono.existsSync(rutaTxt)) return res.status(500).send("No se encontró CLI.TXT");

        const contenido = fsSincrono.readFileSync(rutaTxt, 'utf-8');
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
    } catch (e) {
        res.status(500).send("Error");
    }
});

// 2. Ruta para guardar carga
app.post('/guardar-carga', async (req, res) => {
    try {
        const { patente, monto, total } = req.body;
        const fecha = new Date().toISOString().split('T')[0];
        const hora = new Date().toLocaleTimeString();
        const linea = `"${fecha}","${hora}","${patente}","${monto}","${(monto * 0.05).toFixed(2)}","${total}"\n`;
        await fs.appendFile(ARCHIVO_CSV, linea);
        res.status(200).json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ status: "error" });
    }
});

// 3. Ruta para reporte Excel
app.get('/descargar-reporte', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        if (!fsSincrono.existsSync(ARCHIVO_CSV)) return res.status(404).send("No hay datos");

        const contenido = await fs.readFile(ARCHIVO_CSV, 'utf-8');
        const filas = contenido.split('\n');
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte');
        worksheet.addRow(['Fecha', 'Hora', 'Patente', 'Monto', 'Descuento', 'Total']);
        
        filas.forEach(fila => {
            if (fila.trim()) {
                const datos = fila.replace(/"/g, '').split(',');
                if (datos[0] >= desde && datos[0] <= hasta) {
                    worksheet.addRow(datos);
                }
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (e) {
        res.status(500).send("Error al generar reporte");
    }
});

app.listen(3000, () => {
    console.log("Servidor activo en puerto 3000");
});