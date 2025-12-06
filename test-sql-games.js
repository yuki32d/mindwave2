// Quick test to check SQL games in database
// Run this in browser console on student-game.html

fetch('/api/games/published')
    .then(res => res.json())
    .then(data => {
        console.log('All published games:', data.games);
        console.log('Total games:', data.games.length);

        const sqlGames = data.games.filter(g => g.type === 'sql-builder' || g.type === 'sql');
        console.log('SQL Builder games:', sqlGames);
        console.log('SQL games count:', sqlGames.length);

        if (sqlGames.length === 0) {
            console.log('❌ No SQL games found!');
            console.log('Check if the game was published with published:true');
        } else {
            console.log('✅ SQL games found:', sqlGames.map(g => g.title));
        }
    });
