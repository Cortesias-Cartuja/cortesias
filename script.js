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

let modoActual = 'salida';
let cacheCoches = [];
let contratoActivoID = null;

window.onload = () => {
    cargarAsesores();
    cambiarPestana('salida');
};

function cambiarPestana(modo) {
    modoActual = modo;
    document.getElementById('btn-sal').className = modo === 'salida' ? 'btn-tab active' : 'btn-tab';
    document.getElementById('btn-ent').className = modo === 'entrada' ? 'btn-tab active' : 'btn-tab';
    document.getElementById('btn-accion').innerText = modo === 'salida' ? 'GUARDAR E IMPRIMIR SALIDA' : 'REGISTRAR ENTRADA Y ARCHIVAR';
    document.getElementById('btn-accion').style.background = modo === 'salida' ? '#10b981' : '#312e81';
    
    if(modo === 'salida') {
        document.getElementById('p-f-salida').value = new Date().toLocaleString();
        document.getElementById('d-f-entrada').value = "";
    } else {
        document.getElementById('d-f-entrada').value = new Date().toLocaleString();
    }
    cargarCoches();
}

function cargarCoches() {
    db.ref('coches').on('value', snap => {
        const select = document.getElementById('sel-vehiculos');
        select.innerHTML = '<option value="">Seleccione vehículo...</option>';
        cacheCoches = [];
        snap.forEach(child => {
            const c = child.val();
            c.id = child.key;
            cacheCoches.push(c);
            if(modoActual === 'salida' && c.estado === 'Disponible') {
                select.innerHTML += `<option value="${c.id}">${c.matricula}</option>`;
            } else if(modoActual === 'entrada' && c.estado === 'Prestado') {
                select.innerHTML += `<option value="${c.id}">${c.matricula}</option>`;
            }
        });
    });
}

function seleccionarCoche() {
    const id = document.getElementById('sel-vehiculos').value;
    if(!id) return;
    const coche = cacheCoches.find(x => x.id === id);
    
    // Rellenar datos vehículo
    document.getElementById('p-mod').value = coche.modelo;
    if(document.getElementById('p-mat-print')) document.getElementById('p-mat-print').value = coche.matricula;
    
    // Rellenar datos SEGURO (si existen en el objeto coche en Firebase)
    document.getElementById('p-seg-cia').value = coche.seguroCia || "MAPFRE"; 
    document.getElementById('p-seg-pol').value = coche.seguroPol || "POL-99887722";
    document.getElementById('p-seg-tel').value = coche.seguroTel || "900 123 456";

    if(modoActual === 'salida') {
        document.getElementById('p-kms').value = coche.kms;
    } else {
        db.ref('contratos').orderByChild('matricula').equalTo(coche.matricula).once('value', snap => {
            snap.forEach(child => {
                const con = child.val();
                if(!con.fechaEntrada) {
                    contratoActivoID = child.key;
                    document.getElementById('p-nom').value = con.nombre || "";
                    document.getElementById('p-dni').value = con.dni || "";
                    document.getElementById('p-tel').value = con.tel || "";
                    document.getElementById('p-dir').value = con.direccionRaw || "";
                    document.getElementById('p-mat-c').value = con.matCliente || "";
                    document.getElementById('p-kms').value = con.kms || "";
                }
            });
        });
    }
}

function procesar() {
    if(modoActual === 'salida') finalizarSalida();
    else finalizarEntrada();
}

function finalizarSalida() {
    const idC = document.getElementById('sel-vehiculos').value;
    if(!idC) return alert("Selecciona un coche");

    const coche = cacheCoches.find(x => x.id === idC);
    const data = {
        matricula: coche.matricula,
        modelo: coche.modelo,
        nombre: document.getElementById('p-nom').value,
        dni: document.getElementById('p-dni').value,
        tel: document.getElementById('p-tel').value,
        direccion: document.getElementById('p-via').value + " " + document.getElementById('p-dir').value,
        direccionRaw: document.getElementById('p-dir').value, // Para recuperar en entrada
        cp: document.getElementById('p-cp').value,
        carnetExp: document.getElementById('p-carnet-exp').value,
        carnetCad: document.getElementById('p-carnet-cad').value,
        matCliente: document.getElementById('p-mat-c').value,
        fDevolucionPrevista: document.getElementById('p-f-devolucion').value,
        tarifa: document.getElementById('p-tarifa').value,
        fechaSalida: document.getElementById('p-f-salida').value,
        kms: Number(document.getElementById('p-kms').value),
        combustibleSalida: document.getElementById('p-comb').value,
        asesor: document.getElementById('p-asesor').value,
        nOr: document.getElementById('p-or').value
    };

    db.ref('contratos').push(data).then(() => {
        db.ref('coches/' + idC).update({ estado: 'Prestado' });
        window.print();
        location.reload();
    });
}

function finalizarEntrada() {
    const idC = document.getElementById('sel-vehiculos').value;
    if(!contratoActivoID) return alert("No se encontró el contrato activo");

    const kmsE = Number(document.getElementById('d-kms').value);
    if(!kmsE) return alert("KMs de entrada obligatorios");

    db.ref('contratos/' + contratoActivoID).update({
        fechaEntrada: document.getElementById('d-f-entrada').value,
        kmsEntrada: kmsE,
        combustibleEntrada: document.getElementById('d-comb-ent').value,
        observacionesEntrada: document.getElementById('d-danos').value
    }).then(() => {
        db.ref('coches/' + idC).update({ estado: 'Disponible', kms: kmsE });
        alert("Entrada registrada correctamente");
        location.reload();
    });
}

function cargarAsesores() {
    db.ref('config/asesores').on('value', snap => {
        const s = document.getElementById('p-asesor');
        s.innerHTML = "";
        snap.forEach(a => { s.innerHTML += `<option>${a.val()}</option>`; });
    });
}
