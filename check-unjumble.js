// Check unjumble game details
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindwave";

const gameSchema = new mongoose.Schema({}, { strict: false });
const Game = mongoose.model("Game", gameSchema);

async function checkUnjumbleGames() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const unjumbleGames = await Game.find({
            $or: [
                { type: 'code-unjumble' },
                { type: 'unjumble' }
            ]
        });

        console.log(`Found ${unjumbleGames.length} unjumble game(s)\n`);

        unjumbleGames.forEach((game, index) => {
            console.log(`Game ${index + 1}: ${game.title}`);
            console.log(`  Type: ${game.type}`);
            console.log(`  Published: ${game.published}`);
            console.log(`  Lines: ${game.lines ? game.lines.length : 0} lines`);
            console.log(`  Lines content:`, game.lines);
            console.log(`  Brief: ${game.brief}`);
            console.log(`  Description: ${game.description}`);
            console.log('---\n');
        });

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkUnjumbleGames();
