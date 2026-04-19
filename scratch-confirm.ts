import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const prisma = new PrismaClient();
  require('dotenv').config({ path: '.env' });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const riders = await prisma.rider.findMany({
    where: { authUserId: { not: null } },
    select: { id: true, name: true, email: true, authUserId: true },
  });

  console.log(`Found ${riders.length} riders.`);

  for (const r of riders) {
    const res = await admin.auth.admin.updateUserById(r.authUserId!, { email_confirm: true });
    if (res.error) console.log(`❌ Failed ${r.name}:`, res.error.message);
    else console.log(`✅ Confirmed: ${r.name}`);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
