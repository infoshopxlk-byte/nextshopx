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
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    // 1. Authenticate with WordPress via JWT (Assumes JWT Authentication for WP-API plugin)
                    // You can find the plugin here: https://wordpress.org/plugins/jwt-authentication-for-wp-api/
                    // Try multiple endpoints to bypass rigid rewrite rules or specific configurations
                    const endpoints = [
                        `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/jwt-auth/v1/token`,
                        `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/?rest_route=/jwt-auth/v1/token`
                    ];

                    let authData = null;
                    let authResponse = null;

                    for (const endpoint of endpoints) {
                        try {
                            console.log(`Trying JWT Auth Endpoint: ${endpoint}`);
                            authResponse = await fetch(endpoint, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    username: credentials.email, // Use full email for JWT plugin matching
                                    password: credentials.password,
                                }),
                            });

                            authData = await authResponse.json();

                            console.log(`JWT Auth Status (${endpoint}):`, authResponse.status, authResponse.statusText);
                            console.log(`JWT Auth Response (${endpoint}):`, authData);

                            if (!authResponse.ok || !authData.token) {
                                // Log the exact error from the WordPress JWT plugin
                                console.error(`=== JWT Auth FAILED ===`);
                                console.error(`  Endpoint : ${endpoint}`);
                                console.error(`  HTTP Status : ${authResponse.status}`);
                                console.error(`  Error Code : ${authData?.code ?? 'N/A'}`);
                                console.error(`  Error Message : ${authData?.message ?? 'No message returned'}`);
                                console.error(`  Full Response : ${JSON.stringify(authData)}`);
                                console.error(`=======================`);
                            }

                            if (authResponse.ok && authData.token) {
                                break; // Success, stop trying endpoints
                            }
                        } catch (e) {
                            console.log(`Error hitting ${endpoint}:`, e);
                        }
                    }

                    if (!authResponse || !authResponse.ok || !authData?.token) {
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
                        jwt: authData.token, // Store the native WordPress JWT
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
                    token.picture = user.image; // Map Google profile picture
                } catch (error) {
                    console.error("WooCommerce Sync Error for Google User:", error);
                }
            } else if (user) {
                // Initial sign in for Credentials provider
                token.id = user.id;
                token.jwt = (user as any).jwt; // Pass to token
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).image = token.picture || (session.user as any).image;
            }
            // Expose the raw JWT to the frontend session correctly
            (session as any).jwt = token.jwt;
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
