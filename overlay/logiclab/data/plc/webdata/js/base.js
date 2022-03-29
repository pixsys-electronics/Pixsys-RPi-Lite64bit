const IMG_BASE_DIR = '/img/';

/**
 * Riempie il footer delle pagine HTML
 */
function loadFooter() {
    let footer = getElement("footer");
    if (!footer) {
        console.error("Could not load footer");
        return;
    }

    let footerContent = createElement("div");
    footerContent.classList.add("footer-content");

    let img = createElement("img");
    img.setAttribute("src", "img/LogoAxel.png");
    img.classList.add("axel-logo");

    let footerText = createElement("span");
    footerText.classList.add("web-server-title");
    footerText.innerText = "Embedded Web Server";

    footerContent.appendChild(img);
    footerContent.appendChild(footerText);
    footer.appendChild(footerContent);
}

/**
 * Abilita e disabilita i bottoni applicando anche lo stile
 * @param {*} id 
 * @param {boolean} enable 
 */
function enableButton(id, enable) {
    let btn = getElement(id);
    if (!btn)
        return;

    btn.disabled = !enable;

    enable ? btn.classList.remove("disabled") : btn.classList.add("disabled");
}

/**
 * Formatta un numero con il numero di decimali specificato
 * @param {*} val 
 * @param {*} decimals 
 */
function fixNumber(val, decimals) {
    return Number.parseFloat(val).toFixed(decimals).toString();
}

function getElement(elemName) {
    return document.getElementById(elemName);
}

function createElement(elemName) {
    return document.createElement(elemName);
}

/**
 * Costruisce i bottoni di navigazione delle pagine
 * @param {string} activeMenu parte finale dell'url (tipo '/info.html') per evidenziare il bottone della pagina corrente
 */
function showNavbarButtons(activeMenu, homeOnly) {
    // nodo a cui appendere i children
    let btnContainer = getElement('headButtonContainer');
    if (!btnContainer)
        return;

    let btnHome = createElement('button');
    btnHome.classList.add('head-button');
    btnHome.title = 'Home';
    btnHome.addEventListener('click', function() {
        window.location = '../';
    });
    let imgHome = createElement('img');
    imgHome.src = IMG_BASE_DIR + 'home.png';
    imgHome.alt = 'Home logo';
    btnHome.appendChild(imgHome);
    btnContainer.appendChild(btnHome);

    if (homeOnly !== true) {
        const LLXMAIN_URL = '/llxmain.html';
        let btnRuntime = createElement('button');
        btnRuntime.classList.add('head-button');
        btnRuntime.title = 'LogicLab Runtime Monitor';
        btnRuntime.addEventListener('click', function() {
            window.location = LLXMAIN_URL;
        });
        btnRuntime.disabled = (activeMenu == LLXMAIN_URL);
        let imgRuntime = createElement('img');
        imgRuntime.src = IMG_BASE_DIR + 'llxmain.png';
        imgRuntime.alt = 'Settings logo';
        btnRuntime.appendChild(imgRuntime);
    
        const LIC_URL = '/license.html';
        let btnLicense = createElement('button');
        btnLicense.classList.add('head-button');
        btnLicense.title = 'License Manager';
        btnLicense.addEventListener('click', function() {
            window.location = LIC_URL;
        });
        btnLicense.disabled = (activeMenu == LIC_URL);
        let imgKey = createElement('img');
        imgKey.src = IMG_BASE_DIR + 'key.png';
        imgKey.alt = 'Key logo';
        btnLicense.appendChild(imgKey);
    
        const INFO_URL = '/info.html';
        let btnInfo = createElement('button');
        btnInfo.classList.add('head-button');
        btnInfo.title = 'Info';
        btnInfo.addEventListener('click', function() {
            window.location = INFO_URL;
        });
        btnInfo.disabled = (activeMenu == INFO_URL);
        let imgInfo = createElement('img');
        imgInfo.src = IMG_BASE_DIR + 'info.png';
        imgInfo.alt = 'Info logo';
        btnInfo.appendChild(imgInfo);
    
        btnContainer.appendChild(btnRuntime);
        btnContainer.appendChild(btnLicense);
        btnContainer.appendChild(btnInfo);
    }
}

/**
 * Mostra i loghi dei prodotti nella toolbar di navigazione
 */
function showNavbarLogos() {
    let logosContainer = document.getElementById("customLogoArea");
    if (!logosContainer)
        return;

    let llImg = document.createElement('img');
    llImg.src = IMG_BASE_DIR + 'logiclabLogo.png';
    llImg.style.width = '265px';
    llImg.alet = 'Product logo';

    // se INtime cambio immagine
    if (hasINtime()) {
        llImg.src = IMG_BASE_DIR + 'INtime-logo.png';
        logosContainer.style.marginTop = "6px";
    }
    else
        logosContainer.style.marginTop = "14px";


    logosContainer.appendChild(llImg);
    logosContainer.style.marginRight = "3px";
}

function showLoginStatus() {
    let img = getElement("loginStatusImg");
    if (!img)
        return;

    if (!isHTTPS()) {
        img.style.display = "none";
        return;
    }

    const LOGIN_LOGOUT_SUCCESS = "ok";
    let res = LLWebServer.CheckSessionIsValid();
    let isLogged = (res.result == LOGIN_LOGOUT_SUCCESS);
    img.src = IMG_BASE_DIR;
    img.src += isLogged ? 'iconUnlocked.png' : 'iconLocked.png';
    img.addEventListener("click", function() {
        window.location = location.protocol + "//" + location.hostname + '/login.html';
    });

    if (!isLogged)
        img.title = "Read-only mode. Login to make any modification";
    else
        img.title = "User logged in";
}

function isHTTPS() {
    return (document.location.protocol === "https:");
}

/**
 * Controlla se tra la lista dei prodotti disponibili c'e' INtime
 */
function hasINtime() {
    let hasInTime = false;

    if (typeof LLWebServer !== "undefined" && typeof LLWebServer.GetProductList === "function") {
        const RUNTIME_INTIME_NAME = 'LLExec_x86_INtime';

        let prodList = LLWebServer.GetProductList();

        for (let key in prodList) {
            let prod = prodList[key];
            if (prod.name == RUNTIME_INTIME_NAME) {
                hasInTime = true;
                break;
            }
        }
    }

    return hasInTime;
}

var m_messageTimeout;

/**
 * Mostra un messaggio di info tipo popup
 * @param {string} msg testo del messaggio
 * @param {?ALERT_TYPE} alertType tipo di alert in base al valore della costante (INFO di default)
 * @param {?number} autoHideDelay tempo di delay in secondi dopo il quale viene automaticamente nascosto l'alert (10 secondi). -1 per non nascondere mai
 */
function showAlert(msg, alertType, autoHideDelay) {
    let alertEl = document.getElementById('alert');
    if (alertEl === null) {
        console.error("Elemento HTML dell'alert non trovato");
        return;
    }

    document.getElementById('alertTxt').innerText = msg;

    if (!alertType)
        alertType = ALERT_TYPE.INFO;

    if (!autoHideDelay)
        autoHideDelay = 10;

    alertEl.className = "";
    alertEl.classList.add("alert");
    alertEl.classList.add(alertType);
    alertEl.style.display = "block";

    if (m_messageTimeout !== undefined)
        clearTimeout(m_messageTimeout);

    if (autoHideDelay !== -1) {
        // passo il valore in secondi ma il timeout e' il millisecondi
        autoHideDelay *= 1000;
        m_messageTimeout = setTimeout(hideAlert, autoHideDelay);
    }
}

function hideAlert() {
    document.getElementById('alert').style.display = "none";
}

/**
 * Mappa tipo[classe CSS] per dare un colore ai messaggi secondo le regole CSS in axelsw.css
 */
const ALERT_TYPE = {
    INFO: "info",           // azzurro
    WARNING: "warning",     // giallo
    ERROR: "error",         // rosso
    SUCCESS: "success"      // verde
};

// https://stackoverflow.com/a/20097994/3352304
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
    function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}