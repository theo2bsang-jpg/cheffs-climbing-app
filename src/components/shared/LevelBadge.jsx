import React from 'react';
import { Badge } from "@/components/ui/badge";

const levelColors = {
  "4a": "bg-green-100 text-green-800 border-green-300",
  "4b": "bg-green-100 text-green-800 border-green-300",
  "4c": "bg-green-100 text-green-800 border-green-300",
  "5a": "bg-lime-100 text-lime-800 border-lime-300",
  "5b": "bg-lime-100 text-lime-800 border-lime-300",
  "5c": "bg-lime-100 text-lime-800 border-lime-300",
  "6a": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "6a+": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "6b": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "6b+": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "6c": "bg-orange-100 text-orange-800 border-orange-300",
  "6c+": "bg-orange-100 text-orange-800 border-orange-300",
  "7a": "bg-red-100 text-red-800 border-red-300",
  "7a+": "bg-red-100 text-red-800 border-red-300",
  "7b": "bg-red-100 text-red-800 border-red-300",
  "7b+": "bg-red-100 text-red-800 border-red-300",
  "7c": "bg-purple-100 text-purple-800 border-purple-300",
  "7c+": "bg-purple-100 text-purple-800 border-purple-300",
  "8a": "bg-purple-100 text-purple-800 border-purple-300",
  "8a+": "bg-purple-100 text-purple-800 border-purple-300",
  "8b": "bg-violet-100 text-violet-800 border-violet-300",
  "8b+": "bg-violet-100 text-violet-800 border-violet-300",
  "8c": "bg-violet-100 text-violet-800 border-violet-300",
  "8c+": "bg-violet-100 text-violet-800 border-violet-300",
  "9a": "bg-indigo-100 text-indigo-800 border-indigo-300",
  "9a+": "bg-indigo-100 text-indigo-800 border-indigo-300",
  "9b": "bg-indigo-100 text-indigo-800 border-indigo-300",
  "9b+": "bg-indigo-100 text-indigo-800 border-indigo-300",
  "9c": "bg-slate-900 text-white border-slate-700"
};

/** Render a colored badge for a climbing grade level. */
export default function LevelBadge({ niveau, className = "" }) {
  return (
    <Badge 
      variant="outline" 
      className={`${levelColors[niveau] || "bg-gray-100 text-gray-800"} border-2 font-bold ${className}`}
    >
      {niveau}
    </Badge>
  );
}