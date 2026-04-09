import bcrypt from 'bcrypt';

async function hash() {
  const hash = await bcrypt.hash('adminPassword123', 12);
  console.log(hash);
}

hash();
