const fs = require('fs');
console.log("🔍 === ДИАГНОСТИКА ПРИЛОЖЕНИЯ ===");
const files = ['src/firebase.js', 'src/main.jsx', 'src/App.jsx', 'src/context/AuthContext.jsx', 'vite.config.js', 'package.json'];
files.forEach(file => console.log(fs.existsSync(file) ? "✅ " + file + " найден" : "❌ " + file + " НЕ НАЙДЕН!"));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = {...pkg.dependencies, ...pkg.devDependencies};
['react', 'react-dom', 'react-router-dom', 'firebase'].forEach(dep => console.log(deps[dep] ? "✅ " + dep + " установлен" : "❌ " + dep + " НЕ установлен!"));
console.log("📊 === ИТОГИ ===\nДиагностика завершена.");
