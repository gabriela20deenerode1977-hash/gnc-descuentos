const express = require('express');
const fs = require('fs');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Leer clientes
app.get('/verificar', (req, res) => {
    const patente = req.query.patente.toUpperCase().trim();
    if (!fs.existsSync('CLI.TXT')) return res.status(500).send("No existe CLI.TXT");
    const contenido = fs.readFileSync('CLI.TXT', 'utf-8');
    if (contenido.includes(patente)) {
        res.status(200).send("CLIENTE OK");
    } else {
        res.status(404).send("NO REGISTRADO");
    }
});

// Guardar carga simple
app.post('/guardar', (req, res) => {
    const { patente, monto } = req.body;
    const linea = `${new Date().toLocaleString()} - Patente: ${patente}, Monto: ${monto}\n`;
    fs.appendFileSync('registro_cargas.csv', linea);
    res.status(200).send("Guardado");
});

app.listen(3000, () => console.log("Servidor activo en puerto 3000"));