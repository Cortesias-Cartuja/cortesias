// ... (Tus funciones de tabs y carga inicial) ...

function finalizarSalida() {
    const vehId = document.getElementById('p-veh-select').value;
    const matricula = document.getElementById('p-mat-print').value;
    
    const contrato = {
        matricula: matricula,
        nombre: document.getElementById('p-nom').value,
        dni: document.getElementById('p-dni').value,
        tel: document.getElementById('p-tel').value,
        via: document.getElementById('p-tipo-via').value, // NUEVO
        direccion: document.getElementById('p-dir').value, // NUEVO
        carnetExp: document.getElementById('p-carnet-exp').value,
        carnetCad: document.getElementById('p-carnet-cad').value,
        matCliente: document.getElementById('p-mat-c').value,
        fechaSalida: document.getElementById('p-f-salida').value,
        kms: Number(document.getElementById('p-kms').value),
        asesor: document.getElementById('p-asesor-select').value,
        tarifa: document.getElementById('p-tarifa-select').value,
        or: document.getElementById('p-or').value
    };

    // Guardar en Firebase
    db.ref('contratos').push(contrato).then(() => {
        // Actualizar estado coche
        db.ref('coches/' + vehId).update({ estado: 'Prestado' });
        window.print();
        location.reload();
    });
}
