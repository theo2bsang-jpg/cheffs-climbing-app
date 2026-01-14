import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Search, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const typeColors = {
  depart: "bg-red-500",
  fin: "bg-red-500",
  main: "bg-green-500",
  pied: "bg-yellow-500"
};

const typeLabels = {
  depart: "depart/fin",
  fin: "depart/fin",
  main: "main",
  pied: "pied"
};

/** Interactive hold picker with search, click-to-add, and drag reordering. */
export default function HoldSelector({ 
  photoUrl, 
  availableHolds = [], 
  selectedHolds = [], 
  onHoldsChange,
  showOrder = false 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const imageRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [holdChoice, setHoldChoice] = useState(null);

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
    return () => { imageCanvasRef.current = null; };
  }, [photoUrl]);

  const getHoldDisplayName = (holdId, fallback) => {
    const live = availableHolds.find(h => h.id === holdId);
    return live?.nom || fallback || "Prise";
  };

  // Detect click near an existing hold and add to selection
  const handleImageClick = (e) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const clickedHold = availableHolds.find(hold => {
      const distance = Math.sqrt(
        Math.pow(hold.x - clickX, 2) + Math.pow(hold.y - clickY, 2)
      );
      return distance < 3;
    });

    if (clickedHold) {
      setHoldChoice(clickedHold);
    }
  };

  // Add a hold chosen from the search list
  const addHoldByName = (holdId) => {
    const hold = availableHolds.find(h => h.id === holdId);
    if (hold && !selectedHolds.find(h => h.hold_id === hold.id)) {
      const newHold = {
        hold_id: hold.id,
        hold_nom: hold.nom,
        type: "main",
        ordre: showOrder ? selectedHolds.length + 1 : undefined
      };
      onHoldsChange([...selectedHolds, newHold]);
      setSearchTerm("");
    }
  };

  // Remove a selected hold, re-number if ordered
  const removeHold = (holdId) => {
    const newHolds = selectedHolds.filter(h => h.hold_id !== holdId);
    if (showOrder) {
      newHolds.forEach((h, i) => h.ordre = i + 1);
    }
    onHoldsChange(newHolds);
  };

  const filteredHolds = availableHolds.filter(hold =>
    hold.nom.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedHolds.find(h => h.hold_id === hold.id)
  );

  // Update hold type badge
  const changeHoldType = (holdId, newType) => {
    const newHolds = selectedHolds.map(h => 
      h.hold_id === holdId ? { ...h, type: newType } : h
    );
    onHoldsChange(newHolds);
  };

  // Add or update a hold with the chosen type
  const upsertHoldWithType = (hold, chosenType) => {
    const existing = selectedHolds.find(h => h.hold_id === hold.id);
    if (chosenType === 'none') {
      if (existing) removeHold(hold.id);
      return;
    }

    if (existing) {
      changeHoldType(hold.id, chosenType);
    } else {
      const newHold = {
        hold_id: hold.id,
        hold_nom: hold.nom,
        type: chosenType,
        ordre: showOrder ? selectedHolds.length + 1 : undefined
      };
      onHoldsChange([...selectedHolds, newHold]);
    }
  };

  // Persist drag-and-drop order and renumber if needed
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(selectedHolds);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    if (showOrder) {
      items.forEach((h, i) => h.ordre = i + 1);
    }
    
    onHoldsChange(items);
  };

  return (
    <div className="space-y-4">
      {photoUrl && (
        <div className="relative border-4 border-violet-500 rounded-lg overflow-hidden bg-slate-900">
          <img
            ref={imageRef}
            src={photoUrl}
            alt="Spray Wall"
            className="w-full h-auto cursor-crosshair"
            onClick={handleImageClick}
          />
          {availableHolds.map((hold) => {
            const selectedEntry = selectedHolds.find(h => h.hold_id === hold.id);
            const isSelected = Boolean(selectedEntry);
            const type = selectedEntry?.type || null;
            const orderNumber = showOrder ? selectedEntry?.ordre : undefined;
            const typeColorsMap = {
              depart: "#ef4444", // red-500
              fin: "#ef4444",
              main: "#22c55e", // green-500
              pied: "#eab308" // yellow-500
            };

            const getSampledColor = () => {
              const ctx = imageCanvasRef.current;
              if (!ctx || !imageSize.width || !imageSize.height) return "rgba(124,58,237,0.75)";
              try {
                const xPx = Math.min(Math.max(Math.round((hold.x / 100) * imageSize.width), 0), imageSize.width - 1);
                const yPx = Math.min(Math.max(Math.round((hold.y / 100) * imageSize.height), 0), imageSize.height - 1);
                const { data } = ctx.getImageData(xPx, yPx, 1, 1);
                const [r, g, b] = data;
                return `rgba(${r}, ${g}, ${b}, 0.8)`;
              } catch {
                return "rgba(124,58,237,0.75)";
              }
            };

            const fillColor = isSelected && type ? typeColorsMap[type] : getSampledColor();

            return (
              <div
                key={hold.id}
                className={`absolute rounded-full border-2 border-white/80 shadow hover:scale-110 transition-transform ${isSelected ? 'ring-2 ring-black/20 w-7 h-7' : 'w-6 h-6'}`}
                style={{
                  left: `${hold.x}%`,
                  top: `${hold.y}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: fillColor,
                  opacity: 0.9
                }}
                title={`${hold.nom}${isSelected && type ? ` (${typeLabels[type] || type})` : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setHoldChoice(hold);
                }}
              >
                {isSelected && orderNumber && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white drop-shadow">{orderNumber}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <Label className="font-semibold">Rechercher une prise</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Chercher une prise..."
            className="pl-10"
          />
        </div>
        {searchTerm && filteredHolds.length > 0 && (
          <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
            {filteredHolds.slice(0, 5).map(hold => (
              <div
                key={hold.id}
                onClick={() => addHoldByName(hold.id)}
                className="p-2 hover:bg-blue-50 rounded cursor-pointer text-sm"
              >
                {hold.nom}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-3">
          Prises sélectionnées ({selectedHolds.length})
        </h2>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="holds-list">
            {(provided) => (
              <div 
                className="space-y-2 max-h-64 overflow-y-auto"
                role="list"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {selectedHolds.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">Aucune prise sélectionnée</p>
                ) : (
                  selectedHolds.map((hold, index) => (
                    <Draggable key={hold.hold_id} draggableId={String(hold.hold_id)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          role="listitem"
                          className={`flex items-center justify-between bg-slate-50 p-3 rounded cursor-grab active:cursor-grabbing ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-violet-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <GripVertical className="w-5 h-5 text-gray-400" />
                            {showOrder && (
                              <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                                {hold.ordre}
                              </Badge>
                            )}
                            <span className="text-sm font-medium flex-1">{getHoldDisplayName(hold.hold_id, hold.hold_nom)}</span>
                            <Select value={hold.type} onValueChange={(newType) => changeHoldType(hold.hold_id, newType)}>
                              <SelectTrigger className="w-32" aria-label="Type de prise">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="depart">🔴 Départ/Fin</SelectItem>
                                <SelectItem value="main">🟢 Main</SelectItem>
                                <SelectItem value="pied">🟡 Pied</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Retirer ${getHoldDisplayName(hold.hold_id, hold.hold_nom)}`}
                            onClick={() => removeHold(hold.hold_id)}
                            className="text-red-600 hover:bg-red-50 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {holdChoice && (
        <div className="!m-0 fixed inset-0 top-0 left-0 right-0 bottom-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setHoldChoice(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-[360px] space-y-4 border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Prise sélectionnée</p>
                <p className="font-semibold text-lg">{holdChoice.nom}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setHoldChoice(null)} aria-label="Fermer">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex items-center justify-between rounded-lg border border-green-700 px-3 py-2 bg-green-700 hover:bg-green-800 text-white shadow-sm"
                onClick={() => { upsertHoldWithType(holdChoice, 'main'); setHoldChoice(null); }}
              >
                <span className="font-medium">Main</span>
                <span className="w-4 h-4 rounded-full bg-green-400 ring-1 ring-white/50" />
              </button>
              <button
                className="flex items-center justify-between rounded-lg border border-amber-800 px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white shadow-sm"
                onClick={() => { upsertHoldWithType(holdChoice, 'pied'); setHoldChoice(null); }}
              >
                <span className="font-medium">Pied</span>
                <span className="w-4 h-4 rounded-full bg-amber-400 ring-1 ring-amber-200/50" />
              </button>
              <button
                className="flex items-center justify-between rounded-lg border border-red-800 px-3 py-2 bg-red-700 hover:bg-red-800 text-white shadow-sm"
                onClick={() => { upsertHoldWithType(holdChoice, 'depart'); setHoldChoice(null); }}
              >
                <span className="font-medium">Départ/Fin</span>
                <span className="w-4 h-4 rounded-full bg-red-300 ring-1 ring-white/50" />
              </button>
              <button
                className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                onClick={() => { upsertHoldWithType(holdChoice, 'none'); setHoldChoice(null); }}
              >
                <span className="font-medium">Aucune</span>
                <span className="w-4 h-4 rounded-full bg-slate-300 ring-1 ring-white/40" />
              </button>
            </div>
            <p className="text-sm text-gray-500">Choisissez le type de prise pour l'ajouter ou la retirer.</p>
          </div>
        </div>
      )}

    </div>
  );
}