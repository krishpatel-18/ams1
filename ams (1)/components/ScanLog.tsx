import React from 'react';
import { QrCode } from 'lucide-react';

interface ScanLogProps {
  log: { time: string, roll: number, name: string }[];
}

export const ScanLog: React.FC<ScanLogProps> = ({ log }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 max-h-[250px] flex flex-col">
      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <QrCode className="w-4 h-4 text-slate-500" /> Scan Log
      </h3>
      
      <div className="flex-1 overflow-auto bg-slate-50 rounded-lg p-2 border border-slate-100">
        {log.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-8">
            Waiting for scans...
          </div>
        ) : (
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-200">
              {log.map((entry, idx) => (
                <tr key={idx} className="bg-white">
                  <td className="p-2 text-slate-400 font-mono">{entry.time}</td>
                  <td className="p-2 font-bold text-indigo-600">{entry.roll}</td>
                  <td className="p-2 text-slate-700">{entry.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
