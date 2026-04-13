// Configuración de Firebase (Usa la tuya)
const firebaseConfig = {
    apiKey: "AIzaSyAeejUNvRX3KvmHMgKUff5vTS44-_UGCSg",
    authDomain: "cortesias-4235e.firebaseapp.com",
    databaseURL: "https://cortesias-4235e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "cortesias-4235e",
    storageBucket: "cortesias-4235e.firebasestorage.app",
    messagingSenderId: "45340224860",
    appId: "1:45340224860:web:69c15fc56fc5a04ab76599"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Poner fecha actual automáticamente al cargar
window.onload = () => {
    const ahora = new Date().toLocaleString();
    if(document.getElementById('p-f-salida')) document.getElementById('p-f-salida').value = ahora;
    cargarCoches();
    cargarAsesores();
};

function cargarCoches() {
    db.ref('coches').on('value', snap => {
        const select = document.getElementById('p-veh-select');
        select.innerHTML = '<option value="">Seleccione vehículo...</option>';
        snap.forEach(child => {
            const c = child.val();
            if(c.estado === 'Disponible') {
                select.innerHTML += `<option value="${child.key}">${c.matricula} - ${c.modelo}</option>`;
            }
        });
    });
}

function autoRellenarCoche() {
    const id = document.getElementById('p-veh-select').value;
    if(!id) return;
    db.ref('coches/' + id).once('value', snap => {
        const c = snap.val();
        document.getElementById('p-mod').value = c.modelo;
        document.getElementById('p-mat-print').value = c.matricula;
        document.getElementById('p-kms').value = c.kms;
    });
}

function finalizarSalida() {
    const vehId = document.getElementById('p-veh-select').value;
    if(!vehId) return alert("Selecciona un coche");

    const contrato = {
        matricula: document.getElementById('p-mat-print').value,
        nombre: document.getElementById('p-nom').value,
        via: document.getElementById('p-tipo-via').value,
        direccion: document.getElementById('p-dir').value,
        fechaSalida: document.getElementById('p-f-salida').value,
        kms: document.getElementById('p-kms').value,
        asesor: document.getElementById('p-asesor-select').value
        // ... puedes añadir el resto de campos aquí
    };

    db.ref('contratos').push(contrato).then(() => {
        db.ref('coches/' + vehId).update({ estado: 'Prestado' });
        window.print();
        location.reload();
    });
}

function cargarAsesores() {
    db.ref('config/asesores').once('value', snap => {
        const sel = document.getElementById('p-asesor-select');
        snap.forEach(a => { sel.innerHTML += `<option>${a.val()}</option>`; });
    });
}
