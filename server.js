const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n🚀 Server performance initialized on port ${PORT}`);
    console.log(`📡 Admin Dashboard:   http://localhost:${PORT}`);
    console.log(`🎓 Alumni Portal:    http://localhost:${PORT}/portal`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs\n`);
});
