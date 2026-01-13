import { redirect } from 'next/navigation'

export default function NotFound() {
  // Redirect 404s to /profile to avoid exposing errors or unexpected pages
  redirect('/profile')
}
