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
      isProfileComplete: boolean;
      rollNumber?: string | null;
      college?: string | null;
      department?: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
    isProfileComplete?: boolean;
    rollNumber?: string | null;
    college?: string | null;
    department?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    isProfileComplete?: boolean;
    rollNumber?: string | null;
    college?: string | null;
    department?: string | null;
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
          // BUG FIX: Ghost Admin Issue
          // Agar Supreme Admin database me nahi hai, to usko create karo taaki valid ID mile
          let superAdmin = await prisma.user.findUnique({ where: { email } });
          
          if (!superAdmin) {
            superAdmin = await prisma.user.create({
              data: {
                email: email,
                name: "Supreme Admin",
                role: "CLUB_ADMIN",
                emailVerified: new Date(),
                isApproved: true,
                isProfileComplete: true, // Supreme Admin doesn't need onboarding
              }
            });
          }

          return {
            id: superAdmin.id,
            name: superAdmin.name,
            email: superAdmin.email,
            role: superAdmin.role,
            isProfileComplete: superAdmin.isProfileComplete,
            rollNumber: superAdmin.rollNumber,
            college: superAdmin.college,
            department: superAdmin.department,
          };
        }

        // 2. EXECUTIVE & STUDENT CHECK (From Database)
        const user = await prisma.user.findUnique({
          where: { email: email }
        });

        if (!user || !user.password) return null;

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (passwordsMatch) {
          // Guard 1: If the user is an Executive, they MUST be approved by the Admin
          if (user.role === "EXECUTIVE" && !user.isApproved) {
            throw new Error("ExecutiveNotApproved"); // Deny login if not approved yet
          }

          // Guard 2: SECURITY FIX - Students MUST have a verified email to prevent API bypass
          if (user.role === "STUDENT" && !user.emailVerified) {
            throw new Error("UnverifiedEmail"); // Strictly block unverified logins
          }

          // Guard 3: SECURITY FIX - Stop blacklisted/suspended accounts
          if (user.isBlacklisted || user.accountStatus !== "ACTIVE") {
            throw new Error("Account is suspended. Please contact the administrator.");
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isProfileComplete: user.isProfileComplete,
            rollNumber: user.rollNumber,
            college: user.college,
            department: user.department,
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isProfileComplete = user.isProfileComplete;
        token.rollNumber = user.rollNumber;
        token.college = user.college;
        token.department = user.department;
      }
      
      // 🟢 FIX: Listen for client-side update() call to sync session
      if (trigger === "update" && session) {
        token.isProfileComplete = session.isProfileComplete ?? true;
        if (session.college) token.college = session.college;
        if (session.department) token.department = session.department;
        if (session.rollNumber) token.rollNumber = session.rollNumber;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isProfileComplete = token.isProfileComplete as boolean;
        session.user.rollNumber = token.rollNumber as string | null;
        session.user.college = token.college as string | null;
        session.user.department = token.department as string | null;
      }
      return session;
    }
  }
});