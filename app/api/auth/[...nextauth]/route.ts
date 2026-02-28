import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import api from "@/lib/woocommerce";

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    // 1. Authenticate with WordPress via JWT (Assumes JWT Authentication for WP-API plugin)
                    // You can find the plugin here: https://wordpress.org/plugins/jwt-authentication-for-wp-api/
                    const authResponse = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/jwt-auth/v1/token`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    const authData = await authResponse.json();

                    if (!authResponse.ok || !authData.token) {
                        return null;
                    }

                    // 2. Fetch full user details from WooCommerce once authenticated
                    // We search by email to get the specific Customer ID and details
                    const customers = await api.get("customers", { email: credentials.email });
                    const customer = customers.data[0];

                    if (!customer) {
                        return null;
                    }

                    return {
                        id: customer.id.toString(),
                        name: `${customer.first_name} ${customer.last_name}`.trim() || customer.username,
                        email: customer.email,
                    };
                } catch (error) {
                    console.error("Auth Exception:", error);
                    return null;
                }
            }
        })
    ],
    pages: {
        signIn: '/account',
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
