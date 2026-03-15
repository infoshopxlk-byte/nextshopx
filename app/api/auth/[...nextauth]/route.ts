import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import api from "@/lib/woocommerce";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // MANUAL OVERRIDE: Return a hardcoded user object to bypass WordPress issues temporarily
                console.log("MANUAL OVERRIDE: Returning hardcoded user object.");
                return { 
                    id: '1', 
                    name: 'Admin', 
                    email: credentials?.email || 'admin@shopx.lk', 
                    role: 'administrator',
                    token: 'manual-override-token' 
                };
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    // LOCALHOST COOKIE FIX:
    cookies: {
        sessionToken: {
            name: 'next-auth.session-token',
            options: { path: '/', httpOnly: true, sameSite: 'lax', secure: false }
        }
    },
    callbacks: {
        async jwt({ token, user, account }) {
            // Initial sign in
            if (account && account.provider === "google" && user?.email) {
                try {
                    console.log("Syncing Google User with WooCommerce...", user.email);
                    const customers = await api.get("customers", { email: user.email });
                    let customer = customers.data[0];

                    if (!customer) {
                        console.log("Customer not found, creating new WooCommerce user for:", user.email);
                        const names = (user.name || "").split(" ");
                        const firstName = names[0] || "";
                        const lastName = names.slice(1).join(" ") || "";
                        const randomPassword = Math.random().toString(36).slice(-12) + "A1!@";

                        const createdCustomer = await api.post("customers", {
                            email: user.email,
                            first_name: firstName,
                            last_name: lastName,
                            username: user.email.split("@")[0],
                            password: randomPassword,
                        });
                        customer = createdCustomer.data;
                    }

                    token.id = customer.id.toString();
                    token.picture = user.image; 
                    token.role = customer.role || "customer"; 
                } catch (error) {
                    console.error("WooCommerce Sync Error for Google User:", error);
                }
            } else if (user) {
                // Initial sign in for Credentials provider
                token.id = user.id;
                token.role = (user as any).role;
                token.jwt = (user as any).token; 
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).image = token.picture || (session.user as any).image;
                (session.user as any).role = token.role; 
                (session.user as any).token = token.jwt; 
            }
            (session as any).jwt = token.jwt;
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
