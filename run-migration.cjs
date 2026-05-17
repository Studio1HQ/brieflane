const fs = require('fs');
const Database = require('better-sqlite3');

// 1. Open or create the local database file
const db = new Database('corsair.db');

// 2. Read the migration.sql file you created earlier
const migrationSql = fs.readFileSync('migration.sql', 'utf8');

// 3. Execute the SQL statements to build the tables
db.exec(migrationSql);

console.log('🎉 Success! Your Corsair tables have been created in corsair.db');
db.close();