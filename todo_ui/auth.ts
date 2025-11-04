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

    async signIn({ user, account }) {
      // On successful sign-in, register session with backend and set timezone
      if (account?.provider === "google" && user?.email) {
        try {
          // Detect timezone on server-side (will be UTC, but we'll update from client)
          // This just ensures the user is created in the backend database
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
          const response = await fetch(`${backendUrl}/api/auth/register-nextauth-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: account.access_token,
              refresh_token: account.refresh_token,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            // Store backend user ID for later use
            if (data.db_user_id && typeof window !== 'undefined') {
              window.localStorage.setItem('backendUserId', String(data.db_user_id))
            }
          }
        } catch (error) {
          console.error("Failed to register session with backend:", error)
          // Don't block sign-in if backend registration fails
        }
      }
      return true
    },
  },
})
