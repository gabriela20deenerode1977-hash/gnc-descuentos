const net = require('net');

// Probamos ahora el puerto clásico de MySQL (3306) en los dos servidores
const objetivos = [
    { ip: '192.168.1.46', puerto: 3306, nombre: 'Servidor .46 (Puerto 3306)' },
    { ip: '192.168.1.69', puerto: 3306, nombre: 'Servidor .69 (Puerto 3306)' }
];

console.log("=== 👀 RASTREANDO PUERTO DE BASE DE DATOS MYSQL (3306) ===");

objetivos.forEach(target => {
    const cliente = new net.Socket();
    cliente.setTimeout(3000); 

    cliente.connect(target.puerto, target.ip, () => {
        console.log(`\n🎉 ¡¡¡CONEXIÓN EXITOSA EN ${target.nombre}!!! 🎉`);
        cliente.destroy();
    });

    cliente.on('error', (err) => {
        console.log(`❌ ${target.nombre} cerrado: ${err.message}`);
    });

    cliente.on('timeout', () => {
        cliente.destroy();
    });
});