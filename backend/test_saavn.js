const crypto = require('crypto');
const https = require('https');

function decryptUrl(encryptedUrl) {
    const key = Buffer.from('38346591', 'utf8');
    const decipher = crypto.createDecipheriv('des-ecb', key, '');
    let decrypted = decipher.update(encryptedUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted.replace('_96.mp4', '_320.mp4').replace(/\0/g, '').trim();
}

https.get('https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=PgtGdSxofFg', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        const song = json['PgtGdSxofFg'];
        console.log(song.title);
        const enc = song.encrypted_media_url;
        console.log("Encrypted:", enc);
        console.log("Decrypted:", decryptUrl(enc));
    });
});
