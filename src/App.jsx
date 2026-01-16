
import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { toast } from "@/components/ui/use-toast"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Global error handler for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        if (error && typeof error.message === 'string' && error.message.match(/401|unauthorized|not logged in|forbidden/i)) {
          toast({ title: 'Session expirée', description: 'Veuillez vous reconnecter.' });
          window.location.href = '/Login';
        }
      },
    },
    mutations: {
      onError: (error) => {
        if (error && typeof error.message === 'string' && error.message.match(/401|unauthorized|not logged in|forbidden/i)) {
          toast({ title: 'Session expirée', description: 'Veuillez vous reconnecter.' });
          window.location.href = '/Login';
        }
      },
    },
  },
});

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