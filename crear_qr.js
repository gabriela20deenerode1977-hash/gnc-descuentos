const QRCode = require('qrcode');
const fs = require('fs');

// ==== 1. PON AQUÍ LOS DATOS DEL CLIENTE NUEVO ====
const patenteCliente = 'KRM831'; // Cambia esto por la patente real
const nombreCliente = 'GABY'; // Cambia esto por el nombre del cliente
// ================================================

async function generarElQR() {
    // Si no existe la carpeta para guardar los QR, la creamos
    if (!fs.existsSync('./mis_qrs')) {
        fs.mkdirSync('./mis_qrs');
    }

    // Nombre que tendrá el archivo de imagen (ej: AF123JK.png)
    const nombreArchivo = `./mis_qrs/${patenteCliente.toUpperCase()}.png`;

    try {
        // Fabricamos el QR usando SOLO la patente en texto plano
        await QRCode.toFile(nombreArchivo, patenteCliente.toUpperCase(), {
            errorCorrectionLevel: 'H', // Alta resistencia a pantallas rayadas o sucias
            scale: 10,                 // Buena calidad de imagen para el celular
            margin: 4
        });

        console.log(`=========================================`);
        console.log(`✅ ¡QR CREADO CON ÉXITO!`);
        console.log(`🚗 Cliente: ${nombreCliente}`);
        console.log(`🎫 Patente guardada en el QR: ${patenteCliente.toUpperCase()}`);
        console.log(`📁 Buscalo en la carpeta 'mis_qrs'`);
        console.log(`=========================================`);

    } catch (err) {
        console.error('❌ Error al crear el QR:', err);
    }
}

generarElQR();