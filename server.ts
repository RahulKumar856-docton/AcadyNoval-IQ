import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { aiService } from "./src/services/ai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "acadynova-secret-key-2026";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const resolveDatabasePath = () => {
  const configuredPath = String(process.env.DATABASE_PATH || '').trim();
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  // Render services should prefer mounted persistent disk by default.
  if (process.env.RENDER === 'true') {
    return '/var/data/acadynova.db';
  }

  return path.resolve(process.cwd(), 'acadynova.db');
};

const createDatabase = () => {
  const primaryPath = resolveDatabasePath();

  try {
    fs.mkdirSync(path.dirname(primaryPath), { recursive: true });
    const primaryDb = new Database(primaryPath);
    console.log(`[db] Using database: ${primaryPath}`);
    return primaryDb;
  } catch (error) {
    const fallbackPath = path.resolve(process.cwd(), 'acadynova.db');
    fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
    console.warn(`[db] Failed to open ${primaryPath}. Falling back to ${fallbackPath}`);
    return new Database(fallbackPath);
  }
};

const db = createDatabase();
db.pragma("busy_timeout = 5000");
db.pragma("journal_mode = WAL");

const DEPARTMENT_ALIASES: Record<string, string> = {
  CS: 'CSE',
  CSE: 'CSE',
  IT: 'IT',
  SE: 'SE',
  ISE: 'ISE',
  ECE: 'ECE',
  EEE: 'EE',
  EE: 'EE',
  MECH: 'ME',
  ME: 'ME',
  CIVIL: 'CE',
  CE: 'CE',
  BE: 'BE',
  AE: 'AE',
  CHE: 'ChE',
  CHEMICAL: 'ChE',
  PE: 'PE',
  TE: 'TE',
  AU: 'AU',
  VLSI: 'VLSI',
  AIDS: 'AI',
  AI: 'AI',
};

const normalizeDepartment = (dept?: string | null) => {
  const normalizedKey = String(dept || '').trim().toUpperCase();
  return DEPARTMENT_ALIASES[normalizedKey] || String(dept || '').trim();
};

const normalizeUserRecord = (user: any) => {
  if (!user) return user;
  return {
    ...user,
    dept: normalizeDepartment(user.dept),
  };
};

const getSubmissionAnswer = (answers: Record<string, number>, questionId: string, questionIndex: number) => {
  if (!answers) return undefined;
  return answers[questionId] ?? answers[String(questionIndex)];
};

const buildQuestionId = (existingId: any, fallbackIndex: number) => {
  const trimmed = String(existingId || '').trim();
  return trimmed || `question-${fallbackIndex + 1}-${randomUUID().slice(0, 8)}`;
};

const sanitizeQuestions = (questions: any[]): Array<{ id: string; text: string; options: string[]; correctAnswer: number }> => {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((q: any, index: number) => {
      const text = String(q?.text || '').trim();
      const options = Array.isArray(q?.options)
        ? q.options.slice(0, 4).map((opt: any) => String(opt || '').trim())
        : [];
      const correctAnswer = Number(q?.correctAnswer);
      const id = buildQuestionId(q?.id, index);

      return { id, text, options, correctAnswer };
    })
    .filter((q) => {
      const hasValidText = q.text.length > 0;
      const hasFourOptions = q.options.length === 4;
      const hasNonEmptyOptions = q.options.every((opt) => opt.length > 0);
      const validAnswerIndex = q.correctAnswer >= 0 && q.correctAnswer <= 3;
      return hasValidText && hasFourOptions && hasNonEmptyOptions && validAnswerIndex;
    });
};

const buildFallbackQuestions = (topic: string, count: number, difficulty: string) => {
  const safeTopic = topic.trim() || 'General Concepts';
  const normalizedCount = Math.min(Math.max(count, 3), 10);
  const difficultyHint = difficulty || 'Medium';

  return Array.from({ length: normalizedCount }, (_, idx) => {
    const qNum = idx + 1;
    return {
      id: buildQuestionId('', idx),
      text: `(${difficultyHint}) ${safeTopic}: Question ${qNum}. Which statement is the most accurate?`,
      options: [
        `Core concept of ${safeTopic} for question ${qNum}`,
        `A partially correct statement about ${safeTopic}`,
        `An unrelated statement for comparison`,
        `A common misconception about ${safeTopic}`,
      ],
      correctAnswer: 0,
    };
  });
};

const ensureQuestionIds = (questions: any[]) => sanitizeQuestions(Array.isArray(questions) ? questions : []);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    reg_no TEXT,
    dept TEXT,
    year TEXT,
    sem TEXT
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    faculty_id INTEGER NOT NULL,
    dept TEXT,
    year TEXT,
    sem TEXT,
    questions TEXT, -- JSON string
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    time_taken INTEGER DEFAULT 0, -- in seconds
    accuracy REAL DEFAULT 0, -- percentage
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS study_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    topic_type TEXT DEFAULT 'both', -- ssa | quiz | both
    dept TEXT,
    year TEXT,
    sem TEXT,
    is_general INTEGER DEFAULT 1,
    quiz_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES users(id),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
  );
`);

try {
  db.exec("ALTER TABLE quizzes ADD COLUMN status TEXT DEFAULT 'draft'");
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE quizzes ADD COLUMN is_general INTEGER DEFAULT 0");
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE quizzes ADD COLUMN results_published INTEGER DEFAULT 0");
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE submissions ADD COLUMN answers TEXT");
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE users ADD COLUMN subject TEXT");
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE users ADD COLUMN teaching_years TEXT");
} catch (e) {
  // Column already exists
}

try {
  // Create unique index on reg_no for students
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_students_reg_no ON users(reg_no) WHERE role = 'student' AND reg_no IS NOT NULL");
} catch (e) {
  // Index already exists
}

try {
  db.exec("ALTER TABLE study_topics ADD COLUMN topic_type TEXT DEFAULT 'both'");
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE study_topics ADD COLUMN is_general INTEGER DEFAULT 1");
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE study_topics ADD COLUMN quiz_id INTEGER");
} catch (e) {
  // Column already exists
}

for (const [legacyCode, canonicalCode] of Object.entries(DEPARTMENT_ALIASES)) {
  db.prepare("UPDATE users SET dept = ? WHERE UPPER(TRIM(COALESCE(dept, ''))) = ?").run(canonicalCode, legacyCode);
  db.prepare("UPDATE quizzes SET dept = ? WHERE UPPER(TRIM(COALESCE(dept, ''))) = ?").run(canonicalCode, legacyCode);
}

const storedQuizzes: Array<{ id: number; questions: string | null }> = db.prepare("SELECT id, questions FROM quizzes").all();
for (const quiz of storedQuizzes) {
  const parsedQuestions = quiz.questions ? JSON.parse(quiz.questions) : [];
  const normalizedQuestions = ensureQuestionIds(parsedQuestions);
  const normalizedJson = JSON.stringify(normalizedQuestions);
  if (quiz.questions !== normalizedJson) {
    db.prepare("UPDATE quizzes SET questions = ? WHERE id = ?").run(normalizedJson, quiz.id);
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: FRONTEND_ORIGIN,
    },
  });

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = normalizeUserRecord(user);
      next();
    });
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') {
      return res.sendStatus(403);
    }
    next();
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password, role, reg_no, dept, year, sem } = req.body;
    const normalizedDept = normalizeDepartment(dept);
    const normalizedName = String(name || '').trim();

    if (!normalizedName) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // For students, validate college email domain
    if (role === 'student') {
      const emailDomain = email.split('@')[1]?.toLowerCase();
      const allowedDomain = 'mkce.ac.in';
      const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
      
      if (personalDomains.includes(emailDomain)) {
        return res.status(400).json({ error: "Please use your MKCE college email (@mkce.ac.in), not personal email" });
      }
      
      if (emailDomain !== allowedDomain) {
        return res.status(400).json({ error: "Please use your MKCE college email address (@mkce.ac.in)" });
      }
      
      if (!reg_no || reg_no.trim().length < 5) {
        return res.status(400).json({ error: "Valid registration number is required" });
      }
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const displayName = normalizedName;
    
    try {
      const result = db.prepare(
        "INSERT INTO users (name, email, password, role, reg_no, dept, year, sem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(displayName, email, hashedPassword, role, reg_no, normalizedDept, year, sem);
      
      const user = { id: result.lastInsertRowid, name: displayName, email, role, reg_no, dept: normalizedDept, year, sem };
      const token = jwt.sign(user, JWT_SECRET);
      io.emit('user:created', { id: user.id, role: user.role });
      res.json({ token, user });
    } catch (error) {
      res.status(400).json({ error: "Email or registration number already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    // Try to find user by email first, then by registration number for students
    let user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    
    // If not found by email, try registration number (for students)
    if (!user) {
      user = db.prepare("SELECT * FROM users WHERE reg_no = ? AND role = 'student'").get(email);
    }
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...userWithoutPasswordRaw } = user;
      const userWithoutPassword = normalizeUserRecord(userWithoutPasswordRaw);
      const token = jwt.sign(userWithoutPassword, JWT_SECRET);
      res.json({ token, user: userWithoutPassword });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Admin Routes
  app.get('/api/admin/overview', authenticateToken, requireAdmin, (req: any, res) => {
    const totalFaculty = Number(db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'faculty'").get()?.count || 0);
    const totalStudents = Number(db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get()?.count || 0);
    const totalQuizzes = Number(db.prepare('SELECT COUNT(*) as count FROM quizzes').get()?.count || 0);
    const totalSubmissions = Number(db.prepare('SELECT COUNT(*) as count FROM submissions').get()?.count || 0);
    const liveQuizzes = Number(db.prepare("SELECT COUNT(*) as count FROM quizzes WHERE status = 'live'").get()?.count || 0);

    res.json({
      totalFaculty,
      totalStudents,
      totalQuizzes,
      totalSubmissions,
      liveQuizzes,
    });
  });

  app.get('/api/admin/faculty', authenticateToken, requireAdmin, (req: any, res) => {
    const faculty = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.dept,
        u.subject,
        u.teaching_years,
        COUNT(DISTINCT q.id) as totalQuizzes,
        COUNT(s.id) as totalSubmissions,
        COALESCE(AVG(s.score), 0) as avgScore
      FROM users u
      LEFT JOIN quizzes q ON q.faculty_id = u.id
      LEFT JOIN submissions s ON s.quiz_id = q.id
      WHERE u.role = 'faculty'
      GROUP BY u.id, u.name, u.email, u.dept, u.subject, u.teaching_years
      ORDER BY u.id DESC
    `).all();

    res.json(faculty);
  });

  app.put('/api/admin/faculty/:id', authenticateToken, requireAdmin, (req: any, res) => {
    const facultyId = Number(req.params.id);
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const dept = normalizeDepartment(req.body?.dept);
    const subject = String(req.body?.subject || '').trim() || null;
    const teaching_years = String(req.body?.teaching_years || '').trim() || null;

    if (!facultyId || !name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const faculty = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'faculty'").get(facultyId);
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    try {
      db.prepare('UPDATE users SET name = ?, email = ?, dept = ?, subject = ?, teaching_years = ? WHERE id = ? AND role = ?')
        .run(name, email, dept, subject, teaching_years, facultyId, 'faculty');
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Unable to update faculty. Email may already exist.' });
    }
  });

  app.delete('/api/admin/faculty/:id', authenticateToken, requireAdmin, (req: any, res) => {
    const facultyId = Number(req.params.id);
    if (!facultyId) {
      return res.status(400).json({ error: 'Invalid faculty id' });
    }

    const faculty = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'faculty'").get(facultyId);
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    db.prepare('DELETE FROM submissions WHERE quiz_id IN (SELECT id FROM quizzes WHERE faculty_id = ?)').run(facultyId);
    db.prepare('DELETE FROM quizzes WHERE faculty_id = ?').run(facultyId);
    db.prepare("DELETE FROM users WHERE id = ? AND role = 'faculty'").run(facultyId);

    res.json({ success: true });
  });

  app.get('/api/admin/quizzes', authenticateToken, requireAdmin, (req: any, res) => {
    const quizzes = db.prepare(`
      SELECT
        q.id,
        q.title,
        q.status,
        q.dept,
        q.year,
        q.sem,
        q.is_general as isGeneral,
        u.name as facultyName,
        COUNT(s.id) as submissions,
        COALESCE(AVG(s.score), 0) as avgScore
      FROM quizzes q
      LEFT JOIN users u ON u.id = q.faculty_id
      LEFT JOIN submissions s ON s.quiz_id = q.id
      GROUP BY q.id, q.title, q.status, q.dept, q.year, q.sem, q.is_general, u.name
      ORDER BY q.id DESC
    `).all();

    res.json(quizzes);
  });

  app.get('/api/admin/students', authenticateToken, requireAdmin, (req: any, res) => {
    const students = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.dept,
        u.year,
        u.sem,
        u.reg_no,
        COUNT(DISTINCT s.id) as totalSubmissions,
        COALESCE(AVG(s.score), 0) as avgScore
      FROM users u
      LEFT JOIN submissions s ON s.student_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.email, u.dept, u.year, u.sem, u.reg_no
      ORDER BY u.id DESC
    `).all();

    res.json(students);
  });

  app.post('/api/study-topics', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);

    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const rawTopicType = String(req.body?.topicType || 'both').trim().toLowerCase();
    const topicType = ['ssa', 'quiz', 'both'].includes(rawTopicType) ? rawTopicType : 'both';
    const isGeneral = req.body?.isGeneral === false ? 0 : 1;
    const dept = isGeneral ? null : normalizeDepartment(req.body?.dept || req.user.dept);
    const year = isGeneral ? null : (String(req.body?.year || '').trim() || null);
    const sem = isGeneral ? null : (String(req.body?.sem || '').trim() || null);
    const quizId = req.body?.quizId ? Number(req.body.quizId) : null;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (quizId) {
      const quiz = db.prepare('SELECT id FROM quizzes WHERE id = ? AND faculty_id = ?').get(quizId, req.user.id);
      if (!quiz) {
        return res.status(400).json({ error: 'Invalid related quiz selected' });
      }
    }

    const result = db.prepare(
      `INSERT INTO study_topics (faculty_id, title, content, topic_type, dept, year, sem, is_general, quiz_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, title, content, topicType, dept, year, sem, isGeneral, quizId);

    const created: any = db.prepare(
      `SELECT st.id, st.title, st.content, st.topic_type as topicType, st.dept, st.year, st.sem,
              st.is_general as isGeneral, st.quiz_id as quizId, st.created_at as createdAt,
              q.title as quizTitle
       FROM study_topics st
       LEFT JOIN quizzes q ON q.id = st.quiz_id
       WHERE st.id = ?`
    ).get(result.lastInsertRowid);

    io.emit('study-topic:created', created);
    res.json(created);
  });

  app.get('/api/study-topics', authenticateToken, (req: any, res) => {
    if (req.user.role === 'faculty') {
      const topics = db.prepare(
        `SELECT st.id, st.title, st.content, st.topic_type as topicType, st.dept, st.year, st.sem,
                st.is_general as isGeneral, st.quiz_id as quizId, st.created_at as createdAt,
                q.title as quizTitle
         FROM study_topics st
         LEFT JOIN quizzes q ON q.id = st.quiz_id
         WHERE st.faculty_id = ?
         ORDER BY st.created_at DESC, st.id DESC`
      ).all(req.user.id);

      return res.json(topics);
    }

    const topics = db.prepare(
      `SELECT st.id, st.title, st.content, st.topic_type as topicType, st.dept, st.year, st.sem,
              st.is_general as isGeneral, st.quiz_id as quizId, st.created_at as createdAt,
              q.title as quizTitle,
              (SELECT COUNT(*) FROM submissions s WHERE s.quiz_id = st.quiz_id AND s.student_id = ?) as studentSubmitted,
              (SELECT score FROM submissions s WHERE s.quiz_id = st.quiz_id AND s.student_id = ? LIMIT 1) as myScore,
              q.results_published as resultsPublished,
              u.name as facultyName
       FROM study_topics st
       JOIN users u ON u.id = st.faculty_id
       LEFT JOIN quizzes q ON q.id = st.quiz_id
       WHERE st.is_general = 1
         OR (COALESCE(st.dept, '') = COALESCE(?, '') AND COALESCE(st.year, '') = COALESCE(?, '') AND COALESCE(st.sem, '') = COALESCE(?, ''))
       ORDER BY st.created_at DESC, st.id DESC`
    ).all(req.user.id, req.user.id, normalizeDepartment(req.user.dept), req.user.year, req.user.sem);

    const formatted = topics.map((topic: any) => ({
      ...topic,
      myScore: topic.resultsPublished === 1 ? topic.myScore : null,
    }));

    res.json(formatted);
  });

  app.delete('/api/study-topics/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    const topicId = Number(req.params.id);
    if (!topicId) {
      return res.status(400).json({ error: 'Invalid study topic id' });
    }

    const result = db.prepare('DELETE FROM study_topics WHERE id = ? AND faculty_id = ?').run(topicId, req.user.id);
    if (result.changes > 0) {
      return res.json({ success: true });
    }

    res.sendStatus(404);
  });

  // Quiz Routes
  app.post("/api/quizzes/generate", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);

    const topic = String(req.body?.topic || '').trim();
    const count = Number(req.body?.count || 5);
    const difficulty = String(req.body?.difficulty || 'Medium');

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    try {
      const generated = await aiService.generateQuiz(topic, Math.min(Math.max(count, 3), 10), difficulty);
      const questions = sanitizeQuestions(generated?.questions || []);

      if (questions.length === 0) {
        const fallbackQuestions = buildFallbackQuestions(topic, count, difficulty);
        return res.json({
          title: `${topic} Quiz`,
          questions: fallbackQuestions,
          source: "fallback",
        });
      }

      res.json({
        title: generated?.title ? String(generated.title) : `${topic} Quiz`,
        questions,
        source: "ai",
      });
    } catch (error) {
      console.error(error);
      const fallbackQuestions = buildFallbackQuestions(topic, count, difficulty);
      res.json({
        title: `${topic} Quiz`,
        questions: fallbackQuestions,
        source: "fallback",
      });
    }
  });

  app.get("/api/quizzes", authenticateToken, (req: any, res) => {
    let quizzes;
    if (req.user.role === 'faculty') {
      quizzes = db.prepare(`
        SELECT q.*, COUNT(s.id) as submissions, AVG(s.score) as avgScore 
        FROM quizzes q 
        LEFT JOIN submissions s ON q.id = s.quiz_id 
        WHERE q.faculty_id = ? 
        GROUP BY q.id
      `).all(req.user.id);
    } else {
      quizzes = db.prepare(`
        SELECT 
          q.*,
          CASE 
            WHEN q.results_published = 1 THEN (SELECT score FROM submissions WHERE quiz_id = q.id AND student_id = ?)
            ELSE NULL
          END as myScore,
          (SELECT COUNT(*) FROM submissions WHERE quiz_id = q.id AND student_id = ?) as hasSubmitted
        FROM quizzes q 
        WHERE q.status = 'live' AND ((q.dept = ? AND q.year = ? AND q.sem = ?) OR q.is_general = 1)
      `).all(req.user.id, req.user.id, normalizeDepartment(req.user.dept), req.user.year, req.user.sem);
    }
    const quizzesWithQuestions = quizzes.map((q: any) => ({
      ...q,
      questions: ensureQuestionIds(q.questions ? JSON.parse(q.questions) : [])
    }));
    res.json(quizzesWithQuestions);
  });

  app.post("/api/quizzes", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    const { title, dept, year, sem, questions, isGeneral } = req.body;
    const normalizedDept = normalizeDepartment(dept || req.user.dept);

    const validQuestions = sanitizeQuestions(questions || []);

    if (!String(title || '').trim()) {
      return res.status(400).json({ error: "Quiz title is required" });
    }

    if (validQuestions.length === 0) {
      return res.status(400).json({ error: "Add at least one valid question before creating a quiz" });
    }

    const result = db.prepare(
      "INSERT INTO quizzes (title, faculty_id, dept, year, sem, questions, status, is_general) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(title, req.user.id, normalizedDept, year, sem, JSON.stringify(validQuestions), 'live', isGeneral ? 1 : 0);
    
    const newQuiz = { id: result.lastInsertRowid, title, dept: normalizedDept, year, sem, questions: validQuestions, submissions: 0, avgScore: 0, status: 'live', isGeneral };
    io.emit("quiz:launched", newQuiz);
    res.json(newQuiz);
  });

  app.post("/api/quizzes/:id/launch", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    const quizId = req.params.id;
    db.prepare("UPDATE quizzes SET status = 'live' WHERE id = ? AND faculty_id = ?").run(quizId, req.user.id);
    
    const quiz: any = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(quizId);
    if (quiz) {
      const quizWithQuestions = {
        ...quiz,
        questions: ensureQuestionIds(JSON.parse(quiz.questions)),
        submissions: 0,
        avgScore: 0,
        status: 'live'
      };
      io.emit("quiz:launched", quizWithQuestions);
      res.json(quizWithQuestions);
    } else {
      res.sendStatus(404);
    }
  });

  app.post("/api/quizzes/:id/publish-results", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    const quizId = req.params.id;
    const result = db.prepare("UPDATE quizzes SET results_published = 1 WHERE id = ? AND faculty_id = ?").run(quizId, req.user.id);
    
    if (result.changes > 0) {
      io.emit("quiz:results-published", quizId);
      res.json({ success: true });
    } else {
      res.sendStatus(404);
    }
  });

  app.delete("/api/quizzes/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    const quizId = req.params.id;
    
    // Delete submissions first due to foreign key constraints
    db.prepare("DELETE FROM submissions WHERE quiz_id = ?").run(quizId);
    const result = db.prepare("DELETE FROM quizzes WHERE id = ? AND faculty_id = ?").run(quizId, req.user.id);
    
    if (result.changes > 0) {
      io.emit("quiz:deleted", quizId);
      res.json({ success: true });
    } else {
      res.sendStatus(404);
    }
  });

  app.post("/api/quizzes/:id/submit", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'student') return res.sendStatus(403);
    const { score, timeTaken, accuracy, answers } = req.body;
    const quizId = req.params.id;

    const alreadySubmitted = db
      .prepare("SELECT id FROM submissions WHERE quiz_id = ? AND student_id = ? LIMIT 1")
      .get(quizId, req.user.id);

    if (alreadySubmitted) {
      return res.status(409).json({ error: "Quiz already attended by this student" });
    }
    
    const answersJson = answers ? JSON.stringify(answers) : null;
    
    db.prepare(
      "INSERT INTO submissions (quiz_id, student_id, score, time_taken, accuracy, answers) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(quizId, req.user.id, score, timeTaken || 0, accuracy || 0, answersJson);

    const stats = db.prepare(`
      SELECT COUNT(id) as submissions, AVG(score) as avgScore 
      FROM submissions WHERE quiz_id = ?
    `).get(quizId);

    io.emit("quiz:submitted", { quizId, ...stats });
    res.json({ success: true, score });
  });

  app.get("/api/quizzes/:id/submissions", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    const quizId = req.params.id;
    
    // Get the quiz with questions
    const quiz: any = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    
    const questions = ensureQuestionIds(quiz.questions ? JSON.parse(quiz.questions) : []);
    
    // Get submissions
    const submissions = db.prepare(`
      SELECT s.*, u.name as student_name, u.reg_no as student_reg_no
      FROM submissions s 
      JOIN users u ON s.student_id = u.id 
      WHERE s.quiz_id = ?
      ORDER BY s.submitted_at ASC
    `).all(quizId);
    
    // Parse answers for each submission
    const submissionsWithDetails = submissions.map((sub: any) => ({
      ...sub,
      answers: sub.answers ? JSON.parse(sub.answers) : {},
      questions
    }));
    
    res.json({ 
      quiz: { 
        id: quiz.id, 
        title: quiz.title,
        dept: quiz.dept,
        year: quiz.year,
        sem: quiz.sem
      },
      submissions: submissionsWithDetails 
    });
  });

  app.put("/api/submissions/:submissionId", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    
    const { submissionId } = req.params;
    const { score } = req.body;

    if (score === undefined || score === null || score < 0 || score > 100) {
      return res.status(400).json({ error: "Score must be between 0 and 100" });
    }

    // Get the submission to verify faculty owns the quiz
    const submission: any = db.prepare(`
      SELECT s.*, q.faculty_id 
      FROM submissions s 
      JOIN quizzes q ON s.quiz_id = q.id 
      WHERE s.id = ?
    `).get(submissionId);

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (submission.faculty_id !== req.user.id) {
      return res.sendStatus(403);
    }

    // Update the score
    const result = db.prepare("UPDATE submissions SET score = ? WHERE id = ?").run(score, submissionId);

    if (result.changes > 0) {
      io.emit("submission:evaluated", { submissionId, score });
      res.json({ success: true, score });
    } else {
      res.sendStatus(500);
    }
  });

  app.get("/api/stats/student", authenticateToken, (req: any, res) => {
    const stats = db.prepare(`
      SELECT COUNT(id) as totalQuizzes, AVG(score) as avgScore 
      FROM submissions WHERE student_id = ?
    `).get(req.user.id);
    res.json(stats);
  });

  app.get("/api/submissions/me", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'student') return res.sendStatus(403);

    const submissions = db.prepare(`
      SELECT
        s.id,
        s.quiz_id as quizId,
        s.score,
        s.time_taken as timeTaken,
        s.accuracy,
        s.answers,
        s.submitted_at as submittedAt,
        q.title,
        q.dept,
        q.year,
        q.sem,
        q.questions,
        q.results_published as resultsPublished,
        q.status
      FROM submissions s
      JOIN quizzes q ON q.id = s.quiz_id
      WHERE s.student_id = ?
      ORDER BY s.submitted_at DESC
    `).all(req.user.id);

    const formattedSubmissions = submissions.map((submission: any) => {
      const questions = ensureQuestionIds(submission.questions ? JSON.parse(submission.questions) : []);
      const answers = submission.answers ? JSON.parse(submission.answers) : {};
      const correctCount = questions.reduce((count: number, question: any, questionIndex: number) => {
        const studentAnswer = getSubmissionAnswer(answers, question.id, questionIndex);
        return studentAnswer === question.correctAnswer ? count + 1 : count;
      }, 0);

      return {
        id: submission.id,
        quizId: submission.quizId,
        title: submission.title,
        dept: submission.dept,
        year: submission.year,
        sem: submission.sem,
        status: submission.status,
        resultsPublished: submission.resultsPublished === 1,
        submittedAt: submission.submittedAt,
        timeTaken: submission.timeTaken || 0,
        accuracy: submission.accuracy || 0,
        score: submission.resultsPublished === 1 ? submission.score : null,
        correctCount,
        totalQuestions: questions.length,
        questions: submission.resultsPublished === 1 ? questions : [],
        answers: submission.resultsPublished === 1 ? answers : {},
      };
    });

    res.json(formattedSubmissions);
  });

  // Profile Routes
  app.get("/api/profile", authenticateToken, (req: any, res) => {
    const user: any = db.prepare("SELECT id, name, email, role, reg_no, dept, year, sem, subject, teaching_years FROM users WHERE id = ?").get(req.user.id);
    if (user) {
      res.json(normalizeUserRecord(user));
    } else {
      res.sendStatus(404);
    }
  });

  app.put("/api/profile", authenticateToken, async (req: any, res) => {
    const { name, dept, year, sem, password, subject, teaching_years } = req.body;
    const userId = req.user.id;
    const normalizedDept = normalizeDepartment(dept);
    const existingUser: any = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(userId);

    if (!existingUser) {
      return res.sendStatus(404);
    }

    const shouldUpdateName = name !== undefined;
    const normalizedName = shouldUpdateName ? String(name || '').trim() : existingUser.name;

    if (shouldUpdateName && !normalizedName) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    const isFaculty = existingUser.role === 'faculty';
    const subjectVal = isFaculty ? (String(subject || '').trim() || null) : null;
    const teachingYearsVal = isFaculty ? (String(teaching_years || '').trim() || null) : null;

    try {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.prepare("UPDATE users SET name = ?, dept = ?, year = ?, sem = ?, password = ?, subject = ?, teaching_years = ? WHERE id = ?")
          .run(normalizedName, normalizedDept, year, sem, hashedPassword, subjectVal, teachingYearsVal, userId);
      } else {
        db.prepare("UPDATE users SET name = ?, dept = ?, year = ?, sem = ?, subject = ?, teaching_years = ? WHERE id = ?")
          .run(normalizedName, normalizedDept, year, sem, subjectVal, teachingYearsVal, userId);
      }

      const updatedUser: any = db.prepare("SELECT id, name, email, role, reg_no, dept, year, sem, subject, teaching_years FROM users WHERE id = ?").get(userId);
      res.json({ success: true, user: normalizeUserRecord(updatedUser) });
    } catch (error) {
      res.status(400).json({ error: "Failed to update profile" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
