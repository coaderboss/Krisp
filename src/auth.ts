import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

// --- TYPESCRIPT FIX: NextAuth ko 'role' aur 'id' ke baare mein batana ---
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
// -------------------------------------------------------------------------

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 5 * 24 * 60 * 60, // Exact 5 days session expiry
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // 1. SUPREME ADMIN CHECK (From .env file)
        if (
          email === process.env.ADMIN_EMAIL && 
          password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id: "supreme-admin-1",
            name: "Supreme Admin",
            email: email,
            role: "CLUB_ADMIN",
          };
        }

        // 2. EXECUTIVE & STUDENT CHECK (From Database)
        const user = await prisma.user.findUnique({
          where: { email: email }
        });

        if (!user || !user.password) return null;

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (passwordsMatch) {
          // Guard: If the user is an Executive, they MUST be approved by the Admin
          if (user.role === "EXECUTIVE" && !user.isApproved) {
            return null; // Deny login if not approved yet
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role; 
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string; 
      }
      return session;
    }
  }
});