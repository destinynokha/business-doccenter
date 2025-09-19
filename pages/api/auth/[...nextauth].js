import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// Helper function to check if email is whitelisted
function isEmailWhitelisted(email) {
  const whitelistedEmails = process.env.WHITELISTED_EMAILS?.split(',') || []
  return whitelistedEmails.includes(email)
}

// Helper function to get user permissions
function getUserPermissions(email) {
  try {
    const permissions = JSON.parse(process.env.STAFF_PERMISSIONS || '{}')
    return permissions[email] || 'admin'
  } catch (error) {
    console.error('Error parsing staff permissions:', error)
    return 'admin'
  }
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Check if email is whitelisted
        if (!isEmailWhitelisted(user.email)) {
          console.log(`Access denied for non-whitelisted email: ${user.email}`)
          return false
        }
        
        return true
        
      } catch (error) {
        console.error('Sign in error:', error)
        return false
      }
    },
    
    async jwt({ token, user, account }) {
      // Add user permissions to JWT token
      if (user) {
        token.permissions = getUserPermissions(user.email)
      }
      return token
    },
    
    async session({ session, token }) {
      try {
        // Add permissions to session
        session.user.permissions = token.permissions || 'admin'
        
        return session
      } catch (error) {
        console.error('Session callback error:', error)
        session.user.permissions = 'admin'
        return session
      }
    }
  },
  
  pages: {
    signIn: '/',
    error: '/',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`)
    },
    async signOut({ session }) {
      console.log(`User signed out: ${session?.user?.email}`)
    }
  }
}

export default NextAuth(authOptions)
