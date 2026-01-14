import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/** Available tests with unit labels used by the form. */
const TEST_TYPES = [
  { value: 'tendu_20mm_max', label: 'Tendu 20 mm max', unit: 'kg' },
  { value: 'tendu_20mm_continu', label: 'Tendu 20 mm continu (7:3)', unit: 'sec' },
  { value: 'arque_20mm_max', label: 'Arqué 20 mm max', unit: 'kg' },
  { value: 'arque_20mm_continu', label: 'Arqué 20 mm continu (7:3)', unit: 'sec' },
  { value: 'traction_max', label: 'Traction max', unit: 'kg' },
  { value: 'tractions_vide', label: 'Tractions à vide', unit: 'nombre' },
];

/** Capture a performance test entry and emit normalized payload. */
export default function TestForm({ onSubmit, onCancel }) {
  const [typeTest, setTypeTest] = useState('');
  const [valeur, setValeur] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');

  const selectedTest = TEST_TYPES.find(t => t.value === typeTest);

  /** Validate fields then emit payload upstream. */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!typeTest || !valeur) return;
    
    onSubmit({
      type_test: typeTest,
      valeur: parseFloat(valeur),
      date: format(date, 'yyyy-MM-dd'),
      notes,
    });

    setTypeTest('');
    setValeur('');
    setDate(new Date());
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Type de test</label>
        <Select value={typeTest} onValueChange={setTypeTest}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Sélectionnez un test" />
          </SelectTrigger>
          <SelectContent>
            {TEST_TYPES.map(test => (
              <SelectItem key={test.value} value={test.value}>
                {test.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {typeTest && (
        <div>
          <label className="text-sm font-medium text-gray-700">
            Résultat ({selectedTest?.unit})
          </label>
          <Input
            type="number"
            step="0.1"
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            placeholder={`Entrez la valeur en ${selectedTest?.unit}`}
            className="mt-1"
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-700">Date du test</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full mt-1 justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, 'PPP', { locale: fr })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Remarques..."
          className="mt-1"
        />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button 
          type="submit" 
          className="flex-1 bg-[#A4B89A] hover:bg-[#7A8E72]"
          disabled={!typeTest || !valeur}
        >
          Enregistrer
        </Button>
      </div>
    </form>
  );
}