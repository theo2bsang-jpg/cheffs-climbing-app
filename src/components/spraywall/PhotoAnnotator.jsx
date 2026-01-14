import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Save, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Add or rename holds on a spray wall photo and return coordinates. */
export default function PhotoAnnotator({ photoUrl, existingHolds = [], onSave, onCancel }) {
  const [holds, setHolds] = useState(existingHolds);
  const [newHoldName, setNewHoldName] = useState("");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [activeHoldIndex, setActiveHoldIndex] = useState(null);
  const [activeHoldName, setActiveHoldName] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const imageRef = useRef(null);
  const imageCanvasRef = useRef(null);

  // Load image into an offscreen canvas to sample pixel colors under holds
  useEffect(() => {
    if (!photoUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photoUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      imageCanvasRef.current = ctx;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };

    return () => {
      imageCanvasRef.current = null;
    };
  }, [photoUrl]);

  // Store click position to seed a new hold
  const handleImageClick = (e) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setSelectedPoint({ x, y });
  };

  // Append a new hold at the selected point
  const addHold = () => {
    if (!newHoldName.trim() || !selectedPoint) return;
    
    setHolds([...holds, {
      nom: newHoldName.trim(),
      x: selectedPoint.x,
      y: selectedPoint.y
    }]);
    
    setNewHoldName("");
    setSelectedPoint(null);
  };

  // Remove hold by index
  const removeHold = (index) => {
    setHolds(holds.filter((_, i) => i !== index));
    setSelectedIndices([]);
  };

  const removeHoldWithConfirm = (index) => {
    const hold = holds[index];
    const name = hold?.nom || `prise ${index + 1}`;
    setConfirmAction({
      message: `Supprimer ${name} ?`,
      onConfirm: () => removeHold(index)
    });
  };

  const performRemoveSelected = () => {
    const indicesSet = new Set(selectedIndices);
    setHolds(holds.filter((_, i) => !indicesSet.has(i)));
    setSelectedIndices([]);
  };

  const askRemoveSelected = () => {
    if (selectedIndices.length === 0) return;
    const count = selectedIndices.length;
    setConfirmAction({
      message: `Supprimer ${count} prise${count > 1 ? 's' : ''} ?`,
      onConfirm: () => performRemoveSelected()
    });
  };

  const toggleSelected = (index) => {
    setSelectedIndices((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIndices.length === holds.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(holds.map((_, i) => i));
    }
  };

  // Sample the photo color beneath a hold position
  const getHoldColor = (hold) => {
    const ctx = imageCanvasRef.current;
    if (!ctx || !imageSize.width || !imageSize.height) return "rgba(124, 58, 237, 0.75)"; // fallback violet

    const xPx = Math.min(Math.max(Math.round((hold.x / 100) * imageSize.width), 0), imageSize.width - 1);
    const yPx = Math.min(Math.max(Math.round((hold.y / 100) * imageSize.height), 0), imageSize.height - 1);
    const { data } = ctx.getImageData(xPx, yPx, 1, 1);
    const [r, g, b] = data;
    return `rgba(${r}, ${g}, ${b}, 0.75)`;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Instructions :</strong> Cliquez sur la photo pour placer une prise, puis donnez-lui un nom.
        </p>
      </Card>

      <div className="relative border-4 border-violet-500 rounded-lg overflow-hidden bg-slate-900">
        <img 
          ref={imageRef}
          src={photoUrl} 
          alt="Spray Wall"
          className="w-full h-auto cursor-crosshair"
          onClick={handleImageClick}
        />
        
        {holds.map((hold, index) => (
          <div
            key={index}
            className="absolute w-8 h-8 rounded-full border border-white/80 shadow-lg transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-105 transition-transform flex items-center justify-center group"
            style={{ left: `${hold.x}%`, top: `${hold.y}%`, backgroundColor: getHoldColor(hold) }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveHoldIndex(index);
              setActiveHoldName(hold.nom);
            }}
          >
            <span className="sr-only">{hold.nom}</span>
            <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-[11px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow">
              {hold.nom}
            </span>
            <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
        
        {selectedPoint && (
          <div
            className="absolute w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
            style={{ left: `${selectedPoint.x}%`, top: `${selectedPoint.y}%` }}
          />
        )}
      </div>

      {selectedPoint && (
        <div className="!m-0 fixed inset-0 top-0 left-0 right-0 bottom-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => { setSelectedPoint(null); setNewHoldName(""); }}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Nouvelle prise</h3>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedPoint(null); setNewHoldName(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="holdName">Nom</Label>
              <Input
                id="holdName"
                value={newHoldName}
                onChange={(e) => setNewHoldName(e.target.value)}
                placeholder="Ex: Réglette A12"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addHold();
                }}
                className="bg-white text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="destructive"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => { setSelectedPoint(null); setNewHoldName(""); }}
              >
                Annuler
              </Button>
              <Button
                className="bg-violet-600 hover:bg-violet-700"
                onClick={addHold}
                disabled={!newHoldName.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg text-slate-800">
            Prises placées ({holds.length})
          </h2>
          {holds.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                aria-label="Tout sélectionner"
                checked={selectedIndices.length === holds.length && holds.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 accent-violet-600"
              />
              Tout sélectionner
            </label>
          )}
        </div>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {holds.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Aucune prise placée</p>
          ) : (
            holds.map((hold, index) => (
              <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    aria-label={`Sélectionner ${hold.nom}`}
                    checked={selectedIndices.includes(index)}
                    onChange={() => toggleSelected(index)}
                    className="h-4 w-4 accent-violet-600"
                  />
                  <span
                    className="inline-flex items-center justify-center rounded-full text-white text-xs font-bold h-7 w-7 border border-white/70 shadow"
                    style={{ backgroundColor: getHoldColor(hold) }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium flex-1 ml-1">{hold.nom}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeHoldWithConfirm(index)}
                  className="text-red-600 hover:bg-red-700 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="destructive"
            onClick={askRemoveSelected}
            disabled={selectedIndices.length === 0}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            Supprimer la sélection ({selectedIndices.length})
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          onClick={() => onSave(holds)}
          disabled={holds.length === 0}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Enregistrer ({holds.length} prises)
        </Button>
      </div>

      {activeHoldIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setActiveHoldIndex(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Modifier la prise #{activeHoldIndex + 1}</h3>
              <Button variant="ghost" size="icon" onClick={() => setActiveHoldIndex(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editHoldName">Nom</Label>
              <Input
                id="editHoldName"
                value={activeHoldName}
                onChange={(e) => setActiveHoldName(e.target.value)}
                placeholder="Nom de la prise"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const updated = [...holds];
                    updated[activeHoldIndex] = { ...updated[activeHoldIndex], nom: activeHoldName.trim() || updated[activeHoldIndex].nom };
                    setHolds(updated);
                    setActiveHoldIndex(null);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="destructive"
                onClick={() => {
                  removeHoldWithConfirm(activeHoldIndex);
                  setActiveHoldIndex(null);
                }}
              >
                Supprimer
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  const updated = [...holds];
                  updated[activeHoldIndex] = { ...updated[activeHoldIndex], nom: activeHoldName.trim() || updated[activeHoldIndex].nom };
                  setHolds(updated);
                  setActiveHoldIndex(null);
                }}
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmAction(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-lg">
                !
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="text-lg font-semibold text-slate-900">Confirmer la suppression</h4>
                <p className="text-sm text-slate-700">{confirmAction.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                className="h-10 px-4 min-w-[120px] bg-white border border-slate-300 text-slate-900 hover:bg-slate-100 shadow-sm"
                onClick={() => setConfirmAction(null)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="h-10 px-4 min-w-[120px] bg-red-600 hover:bg-red-700"
                onClick={() => {
                  confirmAction.onConfirm?.();
                  setConfirmAction(null);
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}