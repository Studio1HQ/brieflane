const db = require('better-sqlite3')('corsair.db');
const schema = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
console.log(JSON.stringify(schema, null, 2));