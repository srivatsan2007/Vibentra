const CryptoJS = require("crypto-js");

function decryptUrl(encryptedUrl) {
    const key = CryptoJS.enc.Utf8.parse('38346591');
    const decrypted = CryptoJS.DES.decrypt({
        ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl)
    }, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

const enc = "ID2ieOjCrwdjlkMElYlzWCptgNdUpWD8gkf/+2gUVIhoX44HqBDpZhRzIPEm5tx/lQA7ccWml54k40nDyzmzMo92mytrdt3FDnQW0nglPS4=";
console.log(decryptUrl(enc));
