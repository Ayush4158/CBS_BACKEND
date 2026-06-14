import app from './app.js';
import 'dotenv/config';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Modular Server handling cookies, validation, and emails cleanly on port ${PORT}`);
});