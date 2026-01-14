import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TEST_TYPES = [
  { value: 'tendu_20mm_max', label: 'Tendu 20mm max', color: '#0f172a' },
  { value: 'tendu_20mm_continu', label: 'Tendu 20mm continu', color: '#6d28d9' },
  { value: 'arque_20mm_max', label: 'Arqué 20mm max', color: '#0f766e' },
  { value: 'arque_20mm_continu', label: 'Arqué 20mm continu', color: '#ea580c' },
  { value: 'traction_max', label: 'Traction max', color: '#b91c1c' },
  { value: 'tractions_vide', label: 'Tractions à vide', color: '#2563eb' },
];

/** Filterable line chart for performance tests. */
export default function TestChart({ tests }) {
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    // Auto-select all test types present in the data so graphs show by default
    if (tests && tests.length > 0 && selectedTests.length === 0) {
      const types = Array.from(new Set(tests.map(t => t.type_test).filter(Boolean)));
      if (types.length > 0) setSelectedTests(types);
    }
  }, [tests]);

  const toggleTest = (testValue) => {
    setSelectedTests(prev => 
      prev.includes(testValue) 
        ? prev.filter(t => t !== testValue)
        : [...prev, testValue]
    );
  };

  const filteredTests = tests.filter(test => {
    if (selectedDate) {
      const testDate = format(new Date(test.date), 'yyyy-MM-dd');
      const filterDate = format(selectedDate, 'yyyy-MM-dd');
      if (testDate !== filterDate) return false;
    }
    return selectedTests.includes(test.type_test);
  });

  const chartData = filteredTests
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce((acc, test) => {
      const dateKey = format(new Date(test.date), 'dd/MM/yyyy');
      const existing = acc.find(item => item.date === dateKey);
      
      if (existing) {
        existing[test.type_test] = test.valeur;
      } else {
        acc.push({
          date: dateKey,
          [test.type_test]: test.valeur,
        });
      }
      return acc;
    }, []);

  return (
    <Card className="bg-[#F8F6F4] border-2 border-[#A4B89A]">
      <CardHeader>
        <CardTitle className="text-[#1E2827]">Graphiques d'évolution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Filtrer par date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full mt-1 justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Toutes les dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedDate(null)}
              className="mt-2 text-xs"
            >
              Afficher toutes les dates
            </Button>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Tests à afficher</label>
          <div className="space-y-2">
            {TEST_TYPES.map(test => (
              <div key={test.value} className="flex items-center space-x-2">
                <Checkbox
                  id={test.value}
                  checked={selectedTests.includes(test.value)}
                  onCheckedChange={() => toggleTest(test.value)}
                />
                <label
                  htmlFor={test.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  <span style={{ color: test.color }}>■</span> {test.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {selectedTests.length > 0 && chartData.length > 0 && (
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {selectedTests.map(testType => {
                  const testInfo = TEST_TYPES.find(t => t.value === testType);
                  return (
                    <Line
                      key={testType}
                      type="monotone"
                      dataKey={testType}
                      name={testInfo?.label}
                      stroke={testInfo?.color}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedTests.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            Sélectionnez au moins un test pour afficher le graphique
          </p>
        )}

        {selectedTests.length > 0 && chartData.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            Aucune donnée pour la période sélectionnée
          </p>
        )}
      </CardContent>
    </Card>
  );
}