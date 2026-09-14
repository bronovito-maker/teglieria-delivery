import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

type OrderLinkClient = Pick<typeof prisma, "order">;

export function normalizedVerifiedEmail(user: Pick<User, "email" | "email_confirmed_at">): string | null {
  if (!user.email_confirmed_at || !user.email) return null;
  const email = user.email.trim().toLocaleLowerCase("en-US");
  return email || null;
}

export async function linkUnclaimedOrdersToUser(
  user: Pick<User, "id" | "email" | "email_confirmed_at">,
  client: OrderLinkClient = prisma,
): Promise<{ count: number }> {
  const email = normalizedVerifiedEmail(user);
  if (!email) return { count: 0 };

  return client.order.updateMany({
    where: {
      authUserId: null,
      customerEmail: { equals: email, mode: "insensitive" },
    },
    data: { authUserId: user.id },
  });
}
