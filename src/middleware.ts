import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Tentar obter usuario, tratando erros de sessao corrompida
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      // Se houver erro de sessao, limpar cookies e redirecionar para login
      console.error('Erro de autenticacao no middleware:', error.message)

      // Limpar cookies de autenticacao do Supabase
      const cookiesToClear = [
        'sb-lohakxdxgwgpkbmfmzzl-auth-token',
        'sb-lohakxdxgwgpkbmfmzzl-auth-token.0',
        'sb-lohakxdxgwgpkbmfmzzl-auth-token.1',
      ]

      for (const cookieName of cookiesToClear) {
        response.cookies.set({
          name: cookieName,
          value: '',
          maxAge: 0,
          path: '/',
        })
      }

      user = null
    } else {
      user = data.user
    }
  } catch (err) {
    console.error('Erro inesperado no middleware:', err)
    user = null
  }

  // Protect routes (allow public access to login, cadastro, convite, and reset-password pages)
  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/cadastro') ||
    request.nextUrl.pathname.startsWith('/convite') ||
    request.nextUrl.pathname.startsWith('/reset-password')

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check onboarding status for authenticated users
  if (user) {
    const isOnOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding')
    const isOnAuthPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/cadastro'

    // Get user profile to check onboarding status
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completo, primeiro_acesso')
      .eq('id', user.id)
      .single()

    // Redirect to onboarding if first access and not completed
    if (profile && !profile.onboarding_completo && profile.primeiro_acesso) {
      if (!isOnOnboardingPage) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }

    // Redirect to dashboard if onboarding is complete
    if (profile && profile.onboarding_completo) {
      if (isOnOnboardingPage || isOnAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Redirect to dashboard if user is logged in and trying to access auth pages (and onboarding is complete or not first access)
    if (isOnAuthPage && profile && !profile.primeiro_acesso) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}