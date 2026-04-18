const fs = require('fs');
const code = fs.readFileSync('zego-bundle.js', 'utf8');
const escaped = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
fs.writeFileSync('src/utils/ZegoSDK.js', 'export const ZEGO_SDK = `\n' + escaped + '\n`;\n');
