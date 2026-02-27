import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase';

export async function middleware(request: NextRequest) {
    const response = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    const pathname = request.nextUrl.pathname;
    const isLoginPage = pathname === '/login';

    // If not authenticated and NOT on login page → redirect to /login
    if (!session && !isLoginPage) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // If authenticated and on /login → redirect to Dashboard
    if (session && isLoginPage) {
        const dashboardUrl = new URL('/', request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
