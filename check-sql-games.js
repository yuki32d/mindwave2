// Test script to check SQL games in database
// Run with: node check-sql-games.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindwave";

const gameSchema = new mongoose.Schema({
    title: String,
    type: String,
    published: Boolean,
    brief: String,
    description: String,
    createdAt: Date
}, { timestamps: true });

const Game = mongoose.model("Game", gameSchema);

async function checkGames() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const allGames = await Game.find({}).select('title type published brief createdAt').sort({ createdAt: -1 });
        const sqlGames = allGames.filter(g => g.type === 'sql-builder' || g.type === 'sql');
        const publishedGames = allGames.filter(g => g.published === true);
        const publishedSqlGames = sqlGames.filter(g => g.published === true);

        console.log('📊 DATABASE SUMMARY:');
        console.log('='.repeat(50));
        console.log(`Total games: ${allGames.length}`);
        console.log(`Published games: ${publishedGames.length}`);
        console.log(`SQL Builder games (all): ${sqlGames.length}`);
        console.log(`SQL Builder games (published): ${publishedSqlGames.length}`);
        console.log('='.repeat(50));
        console.log('\n');

        if (sqlGames.length === 0) {
            console.log('❌ NO SQL GAMES FOUND IN DATABASE!');
            console.log('   You need to create a SQL game first.\n');
        } else {
            console.log('📝 SQL GAMES IN DATABASE:');
            console.log('='.repeat(50));
            sqlGames.forEach((game, index) => {
                console.log(`\n${index + 1}. ${game.title}`);
                console.log(`   Type: ${game.type}`);
                console.log(`   Published: ${game.published ? '✅ YES' : '❌ NO'}`);
                console.log(`   Brief: ${game.brief || 'No brief'}`);
                console.log(`   Created: ${game.createdAt}`);
            });
            console.log('\n' + '='.repeat(50));

            if (publishedSqlGames.length === 0) {
                console.log('\n⚠️  SQL games exist but NONE are published!');
                console.log('   Set published=true for them to appear in student dashboard.\n');
            } else {
                console.log(`\n✅ ${publishedSqlGames.length} SQL game(s) are published and should appear!\n`);
            }
        }

        console.log('\n📋 ALL GAMES:');
        console.log('='.repeat(50));
        allGames.forEach((game, index) => {
            const status = game.published ? '✅' : '❌';
            console.log(`${index + 1}. [${status}] ${game.title} (${game.type})`);
        });
        console.log('='.repeat(50));

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkGames();
