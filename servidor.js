const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const ARCHIVO_CSV = path.join(__dirname, 'registro_cargas.csv');
const RUTA_TXT = path.join(__dirname, 'CLI.TXT');

app.use(cors());
app.use(express.json());

app.get('/verificar-patente', (req, res) => {
    try {
        const patenteBuscada = req.query.patente.toUpperCase().trim();
        if (!fs.existsSync(RUTA_TXT)) return res.status(500).send("No existe CLI.TXT");

        const contenido = fs.readFileSync(RUTA_TXT, 'utf-8');
        const lineas = contenido.split('\n');
        
        const clienteEncontrado = lineas.find(linea => 
            linea.toUpperCase().includes(patenteBuscada)
        );

        if (clienteEncontrado) {
            res.status(200).json({ patente: patenteBuscada, nombre: clienteEncontrado.trim() });
        } else {
            res.status(404).send("No registrado");
        }
    } catch (e) { res.status(500).send("Error"); }
});

app.post('/guardar-carga', (req, res) => {
    const { patente, monto, total } = req.body;
    const linea = `${new Date().toLocaleDateString()},${patente},${monto},${total}\n`;
    fs.appendFileSync(ARCHIVO_CSV, linea);
    res.status(200).json({ status: "ok" });
});

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));