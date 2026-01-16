import { User } from "@/api/entities";

/** Global night-mode wrapper applying custom theming variables. */
export default function Layout({ children }) {

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>
      <style>{`
        :root {
          --night-bg: #0F172A;
          --night-card: #1E293B;
          --night-border: #334155;
          --climb-orange: #F97316;
          --climb-red: #EF4444;
          --climb-yellow: #F59E0B;
          --climb-blue: #3B82F6;
          --climb-purple: #A855F7;
        }
        
        body {
          background-color: #0F172A;
        }

        /* Override gradient backgrounds */
        .bg-gradient-to-br {
          background: linear-gradient(to bottom right, #1E293B, #0F172A) !important;
        }
        
        /* Cards - Night Mode */
        .bg-white {
          background-color: var(--night-card) !important;
          border: 1px solid var(--night-border);
        }
        
        /* Text colors - Night Mode */
        .text-slate-900, .text-gray-900, .text-slate-800 {
          color: #F1F5F9 !important;
        }

        .text-gray-600, .text-gray-500 {
          color: #94A3B8 !important;
        }

        .text-slate-600, .text-slate-700 {
          color: #CBD5E1 !important;
        }

        /* Headings */
        h1, h2, h3 {
          color: #F1F5F9 !important;
        }

        /* Cards text */
        .bg-white *, .bg-slate-50 *, .bg-gray-50 * {
          color: #F1F5F9 !important;
        }

        .bg-white .text-gray-600, .bg-white .text-gray-500 {
          color: #94A3B8 !important;
        }
        
        /* Buttons - Modern Climbing Colors */
        .bg-blue-500, .bg-blue-600, .bg-violet-500, .bg-violet-600, 
        .bg-purple-500, .bg-purple-600, .bg-indigo-600 {
          background: linear-gradient(135deg, var(--climb-orange), var(--climb-red)) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3) !important;
          border: none !important;
        }
        
        .bg-blue-700, .bg-violet-700, .bg-purple-700, .bg-indigo-700 {
          background: linear-gradient(135deg, #EA580C, #DC2626) !important;
        }
        
        .hover\\:bg-blue-700:hover, .hover\\:bg-violet-700:hover,
        .hover\\:bg-purple-700:hover, .hover\\:bg-indigo-700:hover {
          background: linear-gradient(135deg, #EA580C, #DC2626) !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4) !important;
        }

        /* Card Styling */
        .bg-white {
          border-radius: 16px !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
        }

        /* Special Button Colors */
        .bg-green-600, .bg-green-50 {
          background: linear-gradient(135deg, #10B981, #059669) !important;
          border-radius: 12px !important;
        }

        .bg-pink-500, .bg-pink-600 {
          background: linear-gradient(135deg, var(--climb-purple), #EC4899) !important;
          border-radius: 12px !important;
        }

        .bg-yellow-600 {
          background: linear-gradient(135deg, var(--climb-yellow), #D97706) !important;
          border-radius: 12px !important;
        }

        .bg-orange-600 {
          background: linear-gradient(135deg, var(--climb-orange), #EA580C) !important;
          border-radius: 12px !important;
        }
        
        /* Borders */
        .border-blue-200, .border-blue-300, .border-violet-200, 
        .border-violet-300, .border-purple-300 {
          border-color: var(--night-border) !important;
        }
        
        /* Background variants */
        .bg-blue-50, .bg-violet-50, .bg-purple-50, .from-blue-50, 
        .to-violet-50, .from-violet-50, .to-pink-50 {
          background-color: rgba(249, 115, 22, 0.1) !important;
        }
        
        .from-blue-500, .from-violet-500, .from-purple-500 {
          --tw-gradient-from: var(--climb-orange) !important;
        }
        
        .to-purple-600, .to-violet-500, .to-pink-600 {
          --tw-gradient-to: var(--climb-red) !important;
        }

        /* Slate backgrounds */
        .bg-slate-50 {
          background-color: var(--night-card) !important;
        }
      `}</style>
      {children}
    </div>
  );
}
