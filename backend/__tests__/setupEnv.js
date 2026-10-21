// Unit tests mock the database layer; they only need a signing secret.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
