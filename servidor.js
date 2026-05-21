const express = require('express');
const fs = require('fs');
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

// Verificar Patente
app.get('/verificar', (req, res) => {
    const p = req.query.patente.toUpperCase().trim();
    const cli = fs.readFileSync('CLI.TXT', 'utf-8');
    res.status(cli.includes(p) ? 200 : 404).send(cli.includes(p) ? "CLIENTE OK" : "NO REGISTRADO");
});

// Guardar carga (Manual o Escáner)
app.post('/guardar', (req, res) => {
    const { patente, monto } = req.body;
    const linea = `${new Date().toLocaleString()},${patente},${monto}\n`;
    fs.appendFileSync('registro_cargas.csv', linea);
    res.status(200).send("Guardado");
});

// Reporte Admin / Cierre de Turno
app.get('/reporte', (req, res) => {
    const data = fs.readFileSync('registro_cargas.csv', 'utf-8');
    res.send(data);
});

app.listen(3000, () => console.log("Servidor activo puerto 3000"));