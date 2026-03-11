import Database from "better-sqlite3";

const db = new Database("acadynova.db");

// Update all quizzes to be general so they're visible to all students
const result = db.prepare("UPDATE quizzes SET is_general = 1 WHERE status = 'live'").run();

console.log(`Updated ${result.changes} quiz(zes) to be visible to all students`);

// Show the updated quizzes
const quizzes = db.prepare("SELECT id, title, dept, year, sem, is_general, status FROM quizzes").all();
console.log("\nUpdated quizzes:");
console.table(quizzes);

db.close();
