// Quick script to grant dashboard access to rajkumarw88d@gmail.com
// Run this with: node grant-access-quick.mjs

const USER_EMAIL = "rajkumarw88d@gmail.com";
const ORG_NAME = "MindWave Organization";
const SECRET_KEY = "mindwave-grant-access-2024";

async function grantAccess() {
    try {
        const response = await fetch('https://mindwave2.onrender.com/api/grant-dashboard-access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: USER_EMAIL,
                organizationName: ORG_NAME,
                secretKey: SECRET_KEY
            })
        });

        const result = await response.json();
        console.log(JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('\n✅ SUCCESS! Dashboard access granted!');
            console.log(`\n📧 Email: ${USER_EMAIL}`);
            console.log(`🏢 Organization: ${result.organization.name}`);
            console.log(`💎 Plan: ${result.organization.tier}`);
            console.log('\n🎉 You can now login and access /modern-dashboard.html');
        } else {
            console.error('\n❌ Error:', result.error);
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

grantAccess();
