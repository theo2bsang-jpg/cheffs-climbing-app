import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/** Labels and units keyed by test type identifier. */
const TEST_LABELS = {
  'tendu_20mm_max': { label: 'Tendu 20mm max', unit: 'kg' },
  'tendu_20mm_continu': { label: 'Tendu 20mm continu', unit: 'sec' },
  'arque_20mm_max': { label: 'Arqué 20mm max', unit: 'kg' },
  'arque_20mm_continu': { label: 'Arqué 20mm continu', unit: 'sec' },
  'traction_max': { label: 'Traction max', unit: 'kg' },
  'tractions_vide': { label: 'Tractions à vide', unit: '' },
};

/** Render collapsible test history grouped by month. */
export default function TestHistory({ tests, onDelete }) {
  const testsByMonth = useMemo(() => tests.reduce((acc, test) => {
    const monthKey = format(new Date(test.date), 'MMMM yyyy', { locale: fr });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(test);
    return acc;
  }, {}), [tests]);

  const monthKeys = Object.keys(testsByMonth);
  const [openMonths, setOpenMonths] = useState(() => new Set(monthKeys.slice(0, 1)));
  const [openTests, setOpenTests] = useState(() => new Set());

  /** Toggle month accordion open/closed. */
  const toggleMonth = (month) => {
    setOpenMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month); else next.add(month);
      return next;
    });
  };

  /** Toggle individual test detail visibility. */
  const toggleTest = (id) => {
    setOpenTests(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {Object.entries(testsByMonth).map(([month, monthTests]) => {
        const isOpen = openMonths.has(month);
        return (
          <Card key={month} className="bg-card border border-border">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between cursor-pointer" onClick={() => toggleMonth(month)}>
              <CardTitle className="text-base text-[#1E2827] capitalize">{month}</CardTitle>
              <span className="text-sm text-[#1E2827]">{isOpen ? '−' : '+'}</span>
            </CardHeader>
            {isOpen && (
              <CardContent className="pt-0 pb-4 px-4">
                <div className="space-y-2">
                  {monthTests.map((test) => {
                    const testInfo = TEST_LABELS[test.type_test];
                    const isTestOpen = openTests.has(test.id);
                    return (
                      <div 
                        key={test.id}
                        className="p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleTest(test.id)}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{isTestOpen ? '−' : '+'}</span>
                              <p className="font-semibold text-sm text-[#1E2827] truncate">
                                {testInfo?.label || test.type_test}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500">
                              {format(new Date(test.date), 'dd/MM/yyyy')}
                            </p>
                            {isTestOpen && test.notes && (
                              <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{test.notes}</p>
                            )}
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <p className="text-xl font-bold text-primary">
                              {test.valeur}
                            </p>
                            <p className="text-xs text-gray-500">{testInfo?.unit}</p>
                            {onDelete && (
                              <Button size="sm" variant="destructive" onClick={() => onDelete(test)} className="ml-2">Supprimer</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
      {Object.keys(testsByMonth).length === 0 && (
        <Card className="bg-card border border-border text-center p-8">
          <p className="text-gray-600">Aucun test enregistré</p>
        </Card>
      )}
    </div>
  );
}