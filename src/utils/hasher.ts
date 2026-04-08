import bcrypt from 'bcrypt';

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

export async function hashPassword(pw: string) {
  const salt = await bcrypt.genSalt(ROUNDS);
  return bcrypt.hash(pw, salt);
}

export async function isMatch(raw: string, hashed: string) {
  return bcrypt.compare(raw, hashed);
}
