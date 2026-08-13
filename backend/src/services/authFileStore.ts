import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';

export type StoredUser = {
  id: number;
  email: string;
  fullName: string;
  passwordHash: string;
  createdAt: string;
};

const dataDir = path.resolve(process.cwd(), 'data');
const usersPath = path.join(dataDir, 'auth-users.json');

async function ensureUsersFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(usersPath);
  } catch {
    await fs.writeFile(usersPath, '[]', 'utf-8');
  }
}

async function readUsers(): Promise<StoredUser[]> {
  await ensureUsersFile();
  const content = await fs.readFile(usersPath, 'utf-8');
  try {
    const parsed = JSON.parse(content) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('auth-users.json is malformed — resetting to empty array');
    return [];
  }
}

async function writeUsers(users: StoredUser[]) {
  await ensureUsersFile();
  // Write to a temp file then rename for atomic update (prevents corruption on crash)
  const tmpPath = usersPath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(users, null, 2), 'utf-8');
  await fs.rename(tmpPath, usersPath);
}

export async function findUserByEmail(email: string) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: number) {
  const users = await readUsers();
  return users.find((user) => user.id === id) ?? null;
}

export async function createUser(params: {
  email: string;
  fullName: string;
  passwordHash: string;
}) {
  const users = await readUsers();

  const maxId = users.reduce((max, user) => Math.max(max, user.id), 0);
  const next: StoredUser = {
    id: maxId + 1,
    email: params.email,
    fullName: params.fullName,
    passwordHash: params.passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(next);
  await writeUsers(users);
  return next;
}

export async function ensureDemoUser() {
  const demoEmail = 'demo@grantbridge.org';
  const demoPassword = 'GrantBridge123!';
  const demoName = 'GrantBridge Demo User';

  const users = await readUsers();
  const existingIndex = users.findIndex((user) => user.email.toLowerCase() === demoEmail);
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  if (existingIndex < 0) {
    const maxId = users.reduce((max, user) => Math.max(max, user.id), 0);
    users.push({
      id: maxId + 1,
      email: demoEmail,
      fullName: demoName,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
  } else {
    users[existingIndex] = {
      ...users[existingIndex],
      fullName: demoName,
      passwordHash,
    };
  }

  await writeUsers(users);
}
