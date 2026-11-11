import Shell from '@/components/Shell'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Shell links={[['/admin', 'Painel admin'], ['/dashboard', 'Meu painel']]}>{children}</Shell>
}
