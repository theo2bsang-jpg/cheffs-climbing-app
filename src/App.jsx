import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

/** App root: provides React Query client, routing, and toasts. */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-3 py-2 rounded">
        Passer au contenu principal
      </a>
      <main id="main" role="main" className="min-h-screen">
        <Pages />
      </main>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App 