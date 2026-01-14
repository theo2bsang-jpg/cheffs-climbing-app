import React from 'react';
import { Card } from "@/components/ui/card";
import LevelBadge from '../shared/LevelBadge';
import { User, CheckCircle, XCircle } from 'lucide-react';

const typeColors = {
  depart: "bg-red-500",
  fin: "bg-red-500",
  main: "bg-green-500",
  pied: "bg-yellow-500"
};

/** Visual preview of a boulder with annotated holds and metadata. */
export default function BoulderPreview({ 
  photoUrl, 
  holds, 
  allHolds,
  boulderData,
  showOrder = false 
}) {
  // Locate hold coordinates within the full holds list
  const getHoldPosition = (holdId) => {
    return allHolds.find(h => h.id === holdId);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-r from-violet-50 to-pink-50 border-violet-200">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Nom :</span>
            <p className="font-bold text-violet-900">{boulderData.nom}</p>
          </div>
          <div>
            <span className="text-gray-600">Ouvreur :</span>
            <p className="font-semibold flex items-center gap-1">
              <User className="w-3 h-3" />
              {boulderData.ouvreur}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Niveau :</span>
            <div className="mt-1">
              <LevelBadge niveau={boulderData.niveau} />
            </div>
          </div>
          <div>
            <span className="text-gray-600">Règles :</span>
            <div className="flex gap-1 mt-1">
              {boulderData.match_autorise ? (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Match OK
                </span>
              ) : (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Match non
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="relative border-4 border-violet-600 rounded-lg overflow-visible bg-slate-900 shadow-2xl">
        <img 
          src={photoUrl} 
          alt="Spray Wall Preview"
          className="w-full h-auto rounded-lg"
        />
        
        {holds.map((hold, index) => {
          const position = getHoldPosition(hold.hold_id);
          const liveName = position?.nom || hold.hold_nom || 'Prise';
          const isMissing = !position;

          if (isMissing) {
            // Display red X for deleted hold at original position or fallback position
            return (
              <div
                key={index}
                className="absolute rounded-full border-4 border-white bg-red-600 shadow-xl transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ 
                  left: `${(index * 10 + 15) % 90}%`, 
                  top: `${15 + (index * 5) % 30}%`,
                  width: '48px',
                  height: '48px',
                  opacity: 0.95,
                  zIndex: 100
                }}
                title={`Prise supprimée: ${hold.hold_nom || 'inconnue'}`}
              >
                <span className="text-white font-bold text-2xl">❌</span>
                <span className="absolute top-full mt-1 px-2 py-1 rounded bg-red-700 text-white text-xs whitespace-nowrap shadow">
                  [SUPPR] {hold.hold_nom || 'Prise inconnue'}
                </span>
              </div>
            );
          }

          return (
            <div
              key={index}
              className={`absolute rounded-full border-2 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2 ${typeColors[hold.type]} group`}
              style={{ 
                left: `${position.x}%`, 
                top: `${position.y}%`,
                width: '32px',
                height: '32px',
                opacity: 0.8
              }}
              title={liveName}
            >
              {showOrder && hold.ordre && (
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                  {hold.ordre}
                </span>
              )}
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow">
                {liveName}
              </span>
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/80 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </div>


    </div>
  );
}