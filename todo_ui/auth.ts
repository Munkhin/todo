// define how auth works in app

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
  ],

  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt", // use JSON Web Tokens for session management
  },

  pages: {
    signIn: "/signin", // custom sign-in page 
  },

  trustHost: true,
  debug: process.env.NODE_ENV === "development",

  callbacks: {
    async jwt({ token, account, user }) {
      // If this is the initial sign-in, store tokens & user info
      if (account) {
        token.accessToken = account.access_token
      }
      if (user) {
        token.id = user.id
      }
      return token
    },

    async session({ session, token }) {
      // Expose the token and user ID to the client
      if (token?.accessToken) {
        session.accessToken = token.accessToken as string
      }
      if (token?.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
